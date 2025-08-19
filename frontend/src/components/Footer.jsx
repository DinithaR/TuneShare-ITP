import React from 'react';
import { assets } from '../assets/assets';

const Footer = () => {
  return (
    <div
      className="mt-12"
      style={{
        background: 'var(--color-light)',
        borderTop: '1px solid var(--color-borderColor)',
      }}
    >
      <footer className="px-6 md:px-16 lg:px-24 xl:px-32 w-full pt-10">
        <div 
          className="max-w-7xl mx-auto bg-white rounded-xl shadow-md flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b pl-10"
          style={{ borderColor: 'var(--color-borderColor)' }}
        >
          {/* Logo and Description Section */}
          <div className="flex-1 max-w-sm">
            <img
              src={assets.navbarLogo}
              alt="TuneShare Logo"
              className="mb-6"
              style={{
                width: 120,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(251, 207, 232, 0.5)'
              }}
            />
            <p className="text-sm leading-relaxed mb-6 text-gray-600">
              TuneShare is a peer-to-peer music instrument rental platform with quality instruments. Whether you need a guitar for a gig, a keyboard for practice or drums for a recording, TuneShare makes renting instruments simple, affordable and reliable.
            </p>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-4">
              <a 
                href="#" 
                aria-label="Facebook" 
                className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-pink-50"
              >
                <svg width="20" height="20" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="Instagram" 
                className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-pink-50"
              >
                <svg width="20" height="20" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="LinkedIn" 
                className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-pink-50"
              >
                <svg width="20" height="20" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="YouTube" 
                className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-pink-50"
              >
                <svg width="20" height="20" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                  <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="var(--color-primary)"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Company Links Section */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg mb-5"
              style={{ 
                color: 'var(--color-primary-dull)', 
                letterSpacing: '0.04em' 
              }}
            >
              COMPANY
            </h3>
            <nav>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="#" 
                    style={{ color: 'var(--color-primary)' }} 
                    className="text-sm hover:underline hover:opacity-80 transition-opacity duration-200"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    style={{ color: 'var(--color-primary)' }} 
                    className="text-sm hover:underline hover:opacity-80 transition-opacity duration-200"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    style={{ color: 'var(--color-primary)' }} 
                    className="text-sm hover:underline hover:opacity-80 transition-opacity duration-200"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    style={{ color: 'var(--color-primary)' }} 
                    className="text-sm hover:underline hover:opacity-80 transition-opacity duration-200"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Address Section */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg mb-5"
              style={{ 
                color: 'var(--color-primary-dull)', 
                letterSpacing: '0.04em' 
              }}
            >
              CONTACT
            </h3>
            <address className="not-italic">
              <p className="text-sm mb-2 text-gray-600">
                <strong>Location:</strong>
              </p>
              <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                Colombo, Sri Lanka
              </p>
            </address>
          </div>
        </div>

        {/* Copyright */}
        <div className="py-6 text-center">
          <p className="text-xs md:text-sm text-gray-600">
            Copyright 2025 © TuneShare. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
