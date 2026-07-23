import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthProvider } from "./auth/AuthContext";
import { ProfileProvider } from "./profile/ProfileContext";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Moadi from "./pages/Moadi";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import About from "./About";
import FAQ from "./FAQ";
import CurriculumHome from "./pages/curriculum/CurriculumHome";
import Subjects from "./pages/curriculum/Subjects";
import Chapters from "./pages/curriculum/Chapters";
import Lessons from "./pages/curriculum/Lessons";
import Lesson from "./pages/curriculum/Lesson";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <ProfileProvider>
      <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/moadi" element={<Moadi />} />
          <Route path="/learn" element={<CurriculumHome />} />
          <Route path="/learn/:stageId" element={<Subjects />} />
          <Route path="/learn/:stageId/:subjectId" element={<Chapters />} />
          <Route path="/learn/:stageId/:subjectId/:chapterId" element={<Lessons />} />
          <Route path="/learn/:stageId/:subjectId/:chapterId/:lessonIdx" element={<Lesson />} />
          <Route path="/analyze" element={<Upload />} />
          <Route path="/analyze/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </LanguageProvider>
      </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;