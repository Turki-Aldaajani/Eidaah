// سكربت التحقق الحي لمعيار قبول G1: عمليتا قراءة وكتابة تجريبيتان من الواجهة.
// التشغيل: cd frontend && npm run supabase:smoke
// يقرأ المفاتيح من frontend/.env (نفس مفاتيح عميل الواجهة REACT_APP_*).
//
// الكتابة تتطلب جلسة مسجّلة (سياسة RLS)، لذا السكربت:
//   - يسجّل دخولاً مجهولاً (فعّل Anonymous Sign-ins من Authentication → Providers)
//   - أو يستخدم SUPABASE_SMOKE_EMAIL / SUPABASE_SMOKE_PASSWORD إن وُجدا في .env
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// تحميل frontend/.env يدوياً (السكربت يعمل خارج react-scripts)
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith('#') && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // لا يوجد .env — نكتفي بمتغيرات البيئة الحالية
}

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    '✗ عرّف REACT_APP_SUPABASE_URL وREACT_APP_SUPABASE_ANON_KEY في frontend/.env (انظر supabase/README.md)'
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey);
let failed = false;

function pass(label, detail = '') {
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, error) {
  failed = true;
  console.error(`✗ ${label} — ${error?.message || error}`);
}

// ١) القراءة التجريبية: materials قراءتها عامة بدون تسجيل
const read = await supabase
  .from('materials')
  .select('id, title, processing_status')
  .limit(5);
if (read.error) {
  fail('قراءة materials', read.error);
} else {
  pass('قراءة materials (عامة بدون تسجيل)', `${read.data.length} صف`);
}

// ٢) تسجيل الدخول (شرط الكتابة)
let session;
if (process.env.SUPABASE_SMOKE_EMAIL && process.env.SUPABASE_SMOKE_PASSWORD) {
  session = await supabase.auth.signInWithPassword({
    email: process.env.SUPABASE_SMOKE_EMAIL,
    password: process.env.SUPABASE_SMOKE_PASSWORD,
  });
} else {
  session = await supabase.auth.signInAnonymously();
}

if (session.error || !session.data?.user) {
  fail(
    'تسجيل الدخول للكتابة',
    session.error ||
      'فعّل Anonymous Sign-ins في لوحة Supabase أو مرّر SUPABASE_SMOKE_EMAIL/PASSWORD'
  );
} else {
  const userId = session.data.user.id;
  pass('تسجيل الدخول', `user ${userId.slice(0, 8)}…`);

  // ٣) الكتابة التجريبية: طلب مادة بحالة pending
  const write = await supabase
    .from('material_requests')
    .insert({
      requester_id: userId,
      title: 'G1 smoke test — يُحذف تلقائياً',
      description: 'صف تجريبي من سكربت التحقق supabase-smoke',
      status: 'pending',
    })
    .select()
    .single();

  if (write.error) {
    fail('كتابة material_requests', write.error);
  } else {
    pass('كتابة material_requests', `طلب ${write.data.id.slice(0, 8)}…`);

    // ٤) قراءة ما كُتب ثم تنظيفه
    const readBack = await supabase
      .from('material_requests')
      .select('id, status')
      .eq('id', write.data.id)
      .single();
    if (readBack.error || readBack.data.status !== 'pending') {
      fail('قراءة الطلب المكتوب', readBack.error || 'الحالة ليست pending');
    } else {
      pass('قراءة الطلب المكتوب', 'status = pending');
    }

    const cleanup = await supabase
      .from('material_requests')
      .delete()
      .eq('id', write.data.id);
    if (cleanup.error) {
      fail('تنظيف الصف التجريبي', cleanup.error);
    } else {
      pass('تنظيف الصف التجريبي');
    }
  }

  await supabase.auth.signOut();
}

if (failed) {
  console.error('\nمعيار قبول G1 لم يكتمل — راجع الأخطاء أعلاه.');
  process.exit(1);
}
console.log('\n✅ معيار قبول G1 محقق: قراءة وكتابة تجريبيتان تعملان من الواجهة.');
