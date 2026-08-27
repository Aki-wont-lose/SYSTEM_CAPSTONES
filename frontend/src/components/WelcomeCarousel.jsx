import { useEffect, useState } from 'react';

const slides = [
  {
    id: 1,
    bg: 'bg-[#1e5bb5]',
    content: (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
        <div className="absolute top-0 left-[-10%] w-[30%] h-[160%] -rotate-12 bg-gradient-to-b from-yellow-400 to-yellow-500 opacity-90" />
        <div className="absolute top-0 right-[-15%] w-[45%] h-[160%] -rotate-12 bg-blue-400/30" />
        <div className="relative bg-white rounded-xl px-6 py-4 shadow-xl max-w-md w-full">
          <div className="flex justify-center -mt-8 mb-2">
            <div className="flex -space-x-1">
              {['🧑‍💼','👩‍💼','👨‍🍳','👨‍🏫','👩‍🎓','👨‍💼','👩‍💻'].map((e,i)=><div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs">{e}</div>)}
            </div>
          </div>
          <h2 className="text-blue-600 font-extrabold text-xl sm:text-2xl">WELCOME TO</h2>
          <h1 className="text-blue-600 font-black text-2xl sm:text-3xl tracking-tight" style={{textShadow: '2px 2px 0 #facc15, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'}}>STI COLLEGE</h1>
        </div>
        <div className="absolute bottom-4 left-4 w-12 h-6 bg-yellow-300 rounded-full opacity-80" />
        <div className="absolute bottom-8 right-8 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-xs">😊</div>
      </div>
    )
  },
  {
    id: 2,
    bg: 'bg-[#ffeb00]',
    content: (
      <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
        <div className="flex-1 text-left">
          <h2 className="text-blue-700 font-extrabold text-lg sm:text-xl">How's Your Experience?</h2>
          <p className="text-blue-600 text-xs sm:text-sm mt-1">Tell us more about it and rate us, whether it was great, or you feel there's room for improvement.</p>
          <p className="text-blue-600 text-xs mt-3">Leave a comment by scanning QR or clicking</p>
          <span className="inline-block mt-1 bg-white border-2 border-blue-600 text-blue-700 font-bold text-xs px-3 py-1 rounded">feedback.sti.edu</span>
        </div>
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-xl border-2 border-blue-600 flex items-center justify-center shrink-0">
          <div className="w-20 h-20 border-2 border-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs text-center">STI<br/>Cares</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    bg: 'bg-[#1e2a4a]',
    content: (
      <div className="w-full h-full flex flex-col sm:flex-row">
        <div className="flex-1 bg-[#1e2a4a] p-4 sm:p-6 flex flex-col justify-center text-center sm:text-left">
          <span className="inline-block bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-sm self-center sm:self-start">ANNOUNCEMENT</span>
          <h2 className="text-yellow-300 font-black text-sm sm:text-lg mt-2">Office 365 Services<br/>Important Security Update</h2>
          <p className="text-white text-xs sm:text-sm mt-2">Starting <strong>April 23, 2024</strong>, all students will be required to <strong>activate MFA</strong> to access Office 365.</p>
        </div>
        <div className="flex-1 bg-white p-4 sm:p-6 rounded-tl-[2rem] flex flex-col justify-center">
          <p className="text-gray-600 text-[11px] leading-tight">MFA adds an extra layer of security to your Office 365 account by requiring second factor.</p>
          <div className="border-2 border-red-500 rounded p-2 mt-2 text-center">
            <p className="text-red-500 font-bold text-xs">Get instructions on how to activate MFA here.</p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center">For assistance, email ithelpdesk@sti.edu</p>
        </div>
      </div>
    )
  }
];

const WelcomeCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden shadow-card">
      {slides.map((s, i) => (
        <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'} ${s.bg}`}>
          {s.content}
        </div>
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default WelcomeCarousel;
