import React from "react";

const Footer = () => {
  return (
    <footer className="footer">
      <p className="text-center text-gray-400 text-sm">
            © 2025 Gulf Cargo. All rights reserved. Designed by
            {' '}
            <a
                href="https://domaindude.in"
                target="_blank"
                className="designed-company"
                rel="noopener noreferrer"
            >
                Domain Dude
            </a>
            .
            </p>
    </footer>
  );
};

export default Footer;