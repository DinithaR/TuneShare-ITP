import React from 'react';

const Newsletter = () => {
  return (
    <div className="md:grid md:grid-cols-2 max-w-4xl mx-4 md:mx-auto rounded-xl" 
         style={{backgroundColor: "var(--color-light)", fontFamily: "'Outfit', sans-serif"}}>

      <img
        src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/newsletter/image.png"
        alt="newsletter"
        className="hidden md:block w-full max-w-lg rounded-xl"
      />
      <div className="relative flex items-center justify-center">
        <button className="absolute top-6 right-6" aria-label="Close">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 2 2 13M2 2l11 11"
              stroke="var(--color-primary-dull)"
              strokeOpacity=".7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="max-md:py-20 px-6 md:px-10 text-center">
          <h1 className="text-3xl font-bold" style={{color: "var(--color-primary-dull)"}}>
            Subscribe to our newsletter
          </h1>
          <p className="mt-4" style={{color: "rgba(30,41,59,0.6)"}}>
            Be the first to get the latest news about promotions, and much more!
          </p>
          <form className="mt-8 flex">
            <input
              type="email"
              placeholder="Your email address"
              className="w-full outline-none rounded-l-md border border-r-0 p-4"
              style={{
                borderColor: "var(--color-borderColor)",
                backgroundColor: "white",
                color: "var(--color-primary-dull)"
              }}
            />
            <button
              type="submit"
              className="rounded-r-md px-7 py-2 text-white"
              style={{backgroundColor: "var(--color-primary)"}}
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
