import React from "react";
import HeroSection from "./HeroSection";
import StorytellingSection from "./StorytellingSection";
import CallToActionSection from "./CallToActionSection";
import "../styles/Home.css";
import WhoWeAre from "./WhoWeAre";

const Home = () => {
  return (
    <div className="full-page">
      <section id="hero-section">
        <HeroSection />
      </section>
      <StorytellingSection />
      <section id="WhoWeAre">
        <WhoWeAre />
      </section>
   
      <CallToActionSection />
    </div>
  );
};

export default Home;
