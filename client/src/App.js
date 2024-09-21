import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./Frontend/components/LOGIN&REGISTRATION/Login/Login";
import Signup from "./Frontend/components/LOGIN&REGISTRATION/Signup/Signup";
import Home from "./Frontend/components/Home/home";
import NavBar from "./Frontend/components/Home/Navbar";
// import PaymentHistory from "./Frontend/components/Dashboard/PaymentHistory";
import Footer from "./Frontend/components/Home/Footer";
import MiniNavBar from "./Frontend/components/Home/Mininavbar";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <NavBar />
              <Home />
              <Footer />
            </>
          }
        />{" "}
        <Route
          path="/login"
          element={
            <>
              <MiniNavBar />
              <Login />
            </>
          }
        />
        <Route
          path="/signup"
          element={
            <>
              <MiniNavBar />
              <Signup />
            </>
          }
        />
        
        {/* <Route
          path="/PaymentHistory"
          element={
            <>
              <MiniNavBar />
              <PaymentHistory />
              <Sidebar />
              <Footer />
            </> 
          }
        />*/}
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;
