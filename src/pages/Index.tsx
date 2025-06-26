
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import LibraryCarousel from "@/components/LibraryCarousel";
import ChatInterface from "@/components/ChatInterface";
import ProfileSwitcher from "@/components/ProfileSwitcher";

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'libraries' | 'chat' | 'profiles'>('home');
  const [selectedProfile, setSelectedProfile] = useState<string>('Alex');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Netflix Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-16 py-4 bg-gradient-to-b from-black/80 to-transparent transition-all duration-500">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <h1 className="text-red-600 text-2xl md:text-3xl font-bold">
              BOOKBOT
            </h1>
            <div className="hidden md:flex space-x-6 text-sm">
              <Button
                variant="ghost"
                onClick={() => handleViewChange('home')}
                className={`text-white hover:text-gray-300 p-0 h-auto font-normal ${
                  currentView === 'home' ? 'font-semibold' : ''
                }`}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleViewChange('libraries')}
                className={`text-white hover:text-gray-300 p-0 h-auto font-normal ${
                  currentView === 'libraries' ? 'font-semibold' : ''
                }`}
              >
                Libraries
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleViewChange('chat')}
                className={`text-white hover:text-gray-300 p-0 h-auto font-normal ${
                  currentView === 'chat' ? 'font-semibold' : ''
                }`}
              >
                AI Chat
              </Button>
            </div>
          </div>

          {/* Right Side - Search, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-white cursor-pointer hover:text-gray-300 transition-colors" />
            <Bell className="w-5 h-5 text-white cursor-pointer hover:text-gray-300 transition-colors" />
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 hover:text-gray-300 transition-colors"
              >
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 top-12 w-48 bg-black/90 border border-gray-700 rounded-md py-2 z-50">
                  <button
                    onClick={() => {
                      handleViewChange('profiles');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors"
                  >
                    Manage Profiles
                  </button>
                  <div className="border-t border-gray-700 my-2"></div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors">
                    Sign out of BookBot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        {currentView === 'home' && (
          <div>
            <HeroSection />
            <div className="relative z-10 px-4 md:px-16 pb-20">
              <div className="space-y-12">
                <LibraryCarousel libraries={mockLibraries} title="Popular Libraries" />
                <LibraryCarousel libraries={mockLibraries} title="Recently Added" />
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">Recently Read</h2>
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4">
                    {mockLibraries.flatMap(lib => lib.pdfs).slice(0, 8).map((pdf) => (
                      <Card key={pdf.id} className="bg-transparent border-none hover:scale-105 transition-transform duration-300 cursor-pointer group">
                        <CardContent className="p-0">
                          <div className="aspect-[3/4] bg-gradient-to-br from-red-900 to-red-600 rounded-md flex items-center justify-center relative overflow-hidden">
                            <span className="text-white font-bold text-xs text-center px-2 leading-tight">{pdf.title}</span>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'libraries' && (
          <div className="pt-20 px-4 md:px-16 pb-20">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">All Libraries</h1>
            <LibraryCarousel libraries={mockLibraries} showAll />
          </div>
        )}

        {currentView === 'chat' && (
          <div className="pt-20 px-4 md:px-16 pb-20">
            <ChatInterface />
          </div>
        )}

        {currentView === 'profiles' && (
          <div className="pt-20 px-4 md:px-16 pb-20 min-h-screen flex items-center justify-center">
            <ProfileSwitcher 
              selectedProfile={selectedProfile}
              onProfileSelect={setSelectedProfile}
              onClose={() => handleViewChange('home')}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
