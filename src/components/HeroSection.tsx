
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Info, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onStartChat: () => void;
}

const HeroSection = ({ onStartChat }: HeroSectionProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const heroContent = [
    {
      title: "Unlimited PDFs, Unlimited Possibilities",
      subtitle: "Chat with your documents using advanced AI. Upload, organize, and discover insights from your PDF library.",
      gradient: "from-red-900 via-red-700 to-red-500"
    },
    {
      title: "AI-Powered Document Intelligence",
      subtitle: "Ask questions, get instant answers, and explore your documents like never before with our RAG technology.",
      gradient: "from-purple-900 via-purple-700 to-purple-500"
    },
    {
      title: "Your Personal Knowledge Assistant",
      subtitle: "Transform your PDF collection into an intelligent knowledge base that understands and responds.",
      gradient: "from-blue-900 via-blue-700 to-blue-500"
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroContent.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const currentContent = heroContent[currentSlide];

  return (
    <div className="relative h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background with animated gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${currentContent.gradient} opacity-90 transition-all duration-1000`}>
        <div className="absolute inset-0 bg-black/40"></div>
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center max-w-4xl mx-auto px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-6 flex justify-center">
          <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
        </div>
        
        <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in">
          {currentContent.title}
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed animate-fade-in delay-300">
          {currentContent.subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in delay-500">
          <Button
            onClick={onStartChat}
            size="lg"
            className="bg-white text-black hover:bg-gray-200 font-semibold px-8 py-4 text-lg transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-white/20 group"
          >
            <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
            Start Chatting
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-white/50 text-white hover:bg-white/10 font-semibold px-8 py-4 text-lg transition-all duration-300 hover:scale-105 bg-black/20 backdrop-blur-sm group"
          >
            <Info className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
            Learn More
          </Button>
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center space-x-2 mt-8">
          {heroContent.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 opacity-20">
        <div className="w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
      </div>
      <div className="absolute bottom-20 right-10 opacity-20">
        <div className="w-24 h-24 bg-white/10 rounded-full animate-pulse delay-1000"></div>
      </div>
      <div className="absolute top-1/2 right-20 opacity-20">
        <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse delay-2000"></div>
      </div>
    </div>
  );
};

export default HeroSection;
