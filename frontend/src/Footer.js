import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="container">
        <p>
          <b>إيضاح</b> © ٢٠٢٦ · فريق الذكاء الاصطناعي بنادي إنجاز، جامعة الإمام محمد بن سعود الإسلامية · نموذج أولي، جميع البيانات تجريبية
        </p>
        <p>
          <Link to="/about">عن الفريق</Link> · <Link to="/faq">الأسئلة الشائعة</Link>
        </p>
      </div>
    </footer>
  );
}
