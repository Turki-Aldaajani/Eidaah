import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import About from "./About"; // <-- إضافة جديدة
import FAQ from "./FAQ"; // <-- إضافة جديدة

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/results" element={<Results />} />
        <Route path="/about" element={<About />} /> {/* <-- إضافة جديدة */}
        <Route path="/faq" element={<FAQ />} /> {/* <-- إضافة جديدة */}
      </Routes>
    </Router>
  );
}

export default App;