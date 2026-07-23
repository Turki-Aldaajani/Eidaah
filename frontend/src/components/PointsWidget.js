// ويدجت النقاط والمستوى (مهمة F6) — يظهر بالهيدر للمستخدم المسجَّل فقط،
// لأن النقاط مرتبطة بحسابه في points_ledger. يعرض الرصيد والمستوى (3 مستويات).
import React from "react";
import Icon from "./Icon";
import { useAuth } from "../auth/AuthContext";
import { usePoints } from "../points/PointsContext";

// تحويل الأرقام إلى أرقام عربية-هندية (مستقل عن بيانات المناهج).
function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

export default function PointsWidget() {
  const { session } = useAuth();
  const { balance, level } = usePoints();

  if (!session) return null;

  return (
    <div
      className="points-widget"
      data-testid="points-widget"
      title={`المستوى ${toArabicDigits(level.level)}: ${level.name}`}
    >
      <Icon name="star" filled className="points-star" />
      <span className="points-balance" data-testid="points-balance">
        {toArabicDigits(balance)}
      </span>
      <span className="points-level">{level.name}</span>
    </div>
  );
}
