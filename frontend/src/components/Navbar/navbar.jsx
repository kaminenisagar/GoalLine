import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaLinkedin, 
  FaYoutube 
} from 'react-icons/fa';
import './navbar.css';

export default function Navbar({ onNavClick }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const socialDropdownRef = useRef(null);

  const scroll = (id) => {
    setIsMobileMenuOpen(false);
    if (onNavClick) onNavClick(id);
    else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEmailClick = () => {
    window.location.href = 'mailto:support@goalline.com';
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const socialLinks = {
    facebook: 'https://facebook.com/goalline',
    instagram: 'https://instagram.com/goalline',
    twitter: 'https://twitter.com/goalline',
    linkedin: 'https://linkedin.com/company/goalline',
    youtube: 'https://youtube.com/goalline'
  };

  return (
    <div className="navbar-wrapper-container">
      {/* Top Utility Bar */}
      <div className="top-utility-bar">
        <div className="utility-bar-left">
          <span className="support-badge">24/7 Support</span>
          <a href="tel:+917993019547" className="contact-link">+91 79930 19547</a>
        </div>
        <div className="utility-bar-right">
          {/* Email Button */}
          
          <button 
            type="button" 
            className="email-btn"
            onClick={handleEmailClick}
            aria-label="Send email to support"
          >
            support@goalline.com
          </button>
          
          {/* Social Icons Container - Direct Display */}
          <div className="social-icons-container">
            <a 
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label="Follow us on Facebook"
              title="Facebook"
            >
              <FaFacebook className="social-icon-svg" />
            </a>
            <a 
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label="Follow us on Instagram"
              title="Instagram"
            >
              <FaInstagram className="social-icon-svg" />
            </a>
            <a 
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label="Follow us on Twitter"
              title="Twitter"
            >
              <FaTwitter className="social-icon-svg" />
            </a>
            <a 
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label="Follow us on LinkedIn"
              title="LinkedIn"
            >
              <FaLinkedin className="social-icon-svg" />
            </a>
            <a 
              href={socialLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label="Follow us on YouTube"
              title="YouTube"
            >
              <FaYoutube className="social-icon-svg" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="navbar-container">
        <div 
          className="navbar-brand-block" 
          onClick={() => scroll('home')} 
          role="button" 
          tabIndex={0} 
          onKeyDown={(e) => e.key === 'Enter' && scroll('home')}
          aria-label="GoalLine home"
        >
          <div className="brand-logo-circle">GL</div>
          <h1 className="navbar-heading">
            Goal<span className="span-l">Line</span>
          </h1>
        </div>

        {/* Desktop Navigation */}
        <ul className={`navbar-un ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <li className="line" onClick={() => scroll('home')} role="menuitem">Home</li>
          <li className="line" onClick={() => scroll('features')} role="menuitem">Features</li>
          <li className="line" onClick={() => scroll('how')} role="menuitem">How It Works</li>
          <li className="line" onClick={() => scroll('testimonials')} role="menuitem">Reviews</li>
          <li className="line" onClick={() => scroll('contact')} role="menuitem">Contact</li>
          
          {/* Mobile Social Icons Only */}
          <div className="mobile-social-icons">
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
              <FaFacebook className="mobile-social-icon-svg" />
            </a>
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
              <FaInstagram className="mobile-social-icon-svg" />
            </a>
            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
              <FaTwitter className="mobile-social-icon-svg" />
            </a>
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <FaLinkedin className="mobile-social-icon-svg" />
            </a>
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" title="YouTube">
              <FaYoutube className="mobile-social-icon-svg" />
            </a>
          </div>
          
          <div className="mobile-buttons">
            <Link to="/client/login" className="mobile-login-btn">Client Login</Link>
            <Link to="/staff/login" className="mobile-staff-btn">Staff Login</Link>
            <Link to="/staff/register" className="mobile-register-btn">Register</Link>
          </div>
        </ul>

        {/* Desktop Buttons */}
        <div className="btn-container">
          <Link to="/client/login" className="client-login-btn">Client Login</Link>
          <Link to="/staff/login" className="login-btn">Staff Login</Link>
          <Link to="/staff/register" className="Register-btn">Register</Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>
  );
}
