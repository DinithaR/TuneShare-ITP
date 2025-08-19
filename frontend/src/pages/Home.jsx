
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import FeaturedSection from '../components/FeaturedSection';
import Banner from '../components/Banner';
import Testimonial from '../components/Testimonial';
import Newsletter from '../components/Newsletter';

const Home = () => {
  const { role } = useAppContext();
  const navigate = useNavigate();

  return (
    <>
      <Hero />
      <FeaturedSection />
      <Banner />
      <Testimonial />
      <Newsletter />
    </>
  );
};

export default Home;
