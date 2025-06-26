
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Library, MessageSquare, Upload, Users } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import LibraryCarousel from "@/components/LibraryCarousel";
import ChatInterface from "@/components/ChatInterface";
import ProfileSwitcher from "@/components/ProfileSwitcher";

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'libraries' | 'chat' | 'profiles'>('home');
  const [selectedProfile, setSelectedProfile] = useState<string>('Alex');

  const handleViewChange = (view: 'home' | 'libraries' | 'chat' | 'profiles') => {
    setCurrentView(view);
  };

  const mockLibraries = [
    {
      id: '1',
      name: 'Computer Science',
      description: 'Programming, algorithms, and software engineering',
      pdfCount: 12,
      image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
      pdfs: [
        { id: '1', title: 'Clean Code', author: 'Robert Martin', pages: 464 },
        { id: '2', title: 'JavaScript Patterns', author: 'Stoyan Stefanov', pages: 236 },
        { id: '3', title: 'System Design', author: 'Alex Xu', pages: 322 }
      ]
    },
    {
      id: '2',
      name: 'Data Science',
      description: 'Machine learning, statistics, and analytics',
      pdfCount: 8,
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
      pdfs: [
        { id: '4', title: 'Python for Data Analysis', author: 'Wes McKinney', pages: 544 },
        { id: '5', title: 'Hands-On ML', author: 'Aurélien Géron', pages: 851 }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Header */}
      <nav className="flex items-center justify-between p-6 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold text-white">
            Book<span className="text-purple-400">Bot</span>
          </h1>
          <div className="hidden md:flex space-x-6">
            <Button
              variant={currentView === 'home' ? 'default' : 'ghost'}
              onClick={() => handleViewChange('home')}
              className="text-white hover:text-purple-300"
            >
              Home
            </Button>
            <Button
              variant={currentView === 'libraries' ? 'default' : 'ghost'}
              onClick={() => handleViewChange('libraries')}
              className="text-white hover:text-purple-300"
            >
              <Library className="w-4 h-4 mr-2" />
              Libraries
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'ghost'}
              onClick={() => handleViewChange('chat')}
              className="text-white hover:text-purple-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            className="border-purple-400 text-purple-400 hover:bg-purple-400/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleViewChange('profiles')}
            className="text-white hover:text-purple-300"
          >
            <Users className="w-4 h-4 mr-2" />
            {selectedProfile}
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {currentView === 'home' && (
          <>
            <HeroSection />
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Your Libraries</h2>
              <LibraryCarousel libraries={mockLibraries} />
            </div>
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Recent PDFs</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mockLibraries.flatMap(lib => lib.pdfs).slice(0, 6).map((pdf) => (
                  <Card key={pdf.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="aspect-[3/4] bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-white font-bold text-xs text-center px-2">{pdf.title}</span>
                      </div>
                      <h4 className="text-white text-sm font-medium truncate">{pdf.title}</h4>
                      <p className="text-slate-400 text-xs truncate">{pdf.author}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {currentView === 'libraries' && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">All Libraries</h2>
            <LibraryCarousel libraries={mockLibraries} showAll />
          </div>
        )}

        {currentView === 'chat' && <ChatInterface />}

        {currentView === 'profiles' && (
          <ProfileSwitcher 
            selectedProfile={selectedProfile}
            onProfileSelect={setSelectedProfile}
            onClose={() => handleViewChange('home')}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
