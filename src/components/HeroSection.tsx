
import { Button } from "@/components/ui/button";
import { MessageSquare, Library, Upload } from "lucide-react";

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 p-8 md:p-12">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Your AI-Powered
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              PDF Library
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl">
            Upload, organize, and chat with your documents using advanced AI. 
            Get instant answers from your personal knowledge base.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload First PDF
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-full"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Start Chatting
            </Button>
          </div>
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 right-20 w-20 h-20 bg-purple-400/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-40 w-32 h-32 bg-blue-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
    </div>
  );
};

export default HeroSection;
