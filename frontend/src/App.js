import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import LandingPage from "./pages/LandingPage";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import About from "./About";
import FAQ from "./FAQ";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyze" element={<Upload />} />
          <Route path="/analyze/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;