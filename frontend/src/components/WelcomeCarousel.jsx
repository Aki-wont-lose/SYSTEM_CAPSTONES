import { useEffect, useState } from 'react';

const slides = [
  {
    id: 1,
    bg: 'bg-[#0a6ebd]',
    image: '/slide1.jpg',
    alt: 'Welcome to STI College'
  },
  {
    id: 2,
    bg: 'bg-[#ffeb00]',
    image: '/slide2.jpg',
    alt: 'How is Your Experience'
  },
  {
    id: 3,
    bg: 'bg-[#1e2a4a]',
    image: '/slide3.jpg',
    alt: 'Office 365 Announcement'
  }
];

const WelcomeCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-64 sm:h-72 lg:h-80 rounded-2xl overflow-hidden shadow-card bg-black">
      {slides.map((s, i) => (
        <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
          <img src={s.image} alt={s.alt} className="w-full h-full object-cover" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
          <div className={`hidden absolute inset-0 ${s.bg} flex items-center justify-center p-4 text-center`}>
            <p className="text-white font-bold text-sm">{s.alt} - Place {s.image} in frontend/public/</p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default WelcomeCarousel;
