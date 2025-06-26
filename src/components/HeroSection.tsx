
import { Button } from "@/components/ui/button";
import { Play, Info, Plus } from "lucide-react";

const HeroSection = () => {
  return (
    <div className="relative h-screen flex items-center">
      {/* Background Image with Netflix-style gradient */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.1) 100%), linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%), url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3')`
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-16 max-w-2xl">
        {/* Netflix-style badge */}
        <div className="flex items-center mb-4">
          <span className="bg-red-600 text-white px-2 py-1 text-sm font-bold mr-3">B</span>
          <span className="text-white text-sm font-semibold tracking-wider">SERIES</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-7xl font-bold text-white mb-4 leading-tight">
          AI-POWERED
          <br />
          <span className="text-4xl md:text-6xl">PDF LIBRARY</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-white mb-8 max-w-lg leading-relaxed">
          Upload, organize, and chat with your documents using advanced AI. 
          Get instant answers from your personal knowledge base with intelligent document analysis.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <Button 
            size="lg" 
            className="bg-white hover:bg-gray-200 text-black font-semibold px-8 py-3 rounded-md flex items-center space-x-2 transition-all duration-200"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Reading</span>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-gray-400 bg-gray-600/70 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-md flex items-center space-x-2 transition-all duration-200"
          >
            <Info className="w-5 h-5" />
            <span>More Info</span>
          </Button>
        </div>

        {/* Netflix-style maturity rating and features */}
        <div className="flex items-center space-x-4 mt-8 text-white">
          <span className="border border-gray-400 px-2 py-1 text-sm">AI</span>
          <span className="text-sm">Smart Document Analysis</span>
          <span className="text-sm">•</span>
          <span className="text-sm">Instant Q&A</span>
          <span className="text-sm">•</span>
          <span className="text-sm">Multi-Library Support</span>
        </div>
      </div>

      {/* Age rating and audio/subtitle indicators */}
      <div className="absolute bottom-32 right-4 md:right-16 flex flex-col space-y-2">
        <div className="w-12 h-12 border-2 border-gray-400 rounded-full flex items-center justify-center">
          <Plus className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent"></div>
    </div>
  );
};

export default HeroSection;
