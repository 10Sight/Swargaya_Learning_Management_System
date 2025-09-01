import React from 'react';

const HomeLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md py-4 px-6 border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold text-orange-500">Devi/webakash1806</h1>
          <nav>
            <ul className="flex space-x-6 text-gray-300">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </nav>
          <button className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors">
            Login
          </button>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-black/50 backdrop-blur-md py-6 px-6 border-t border-white/10">
        <div className="container mx-auto text-center text-gray-400">
          &copy; {new Date().getFullYear()} Devi. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default HomeLayout;
