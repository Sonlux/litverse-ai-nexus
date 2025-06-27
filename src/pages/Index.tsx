
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import LibraryCarousel from "@/components/LibraryCarousel";
import ChatInterface from "@/components/ChatInterface";
import LibraryProfiles from "@/components/LibraryProfiles";
import AuthForm from "@/components/AuthForm";
import LibraryManager from "@/components/LibraryManager";
import LibraryView from "@/components/LibraryView";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

// Use Supabase types directly
interface Library {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  _count?: {
    pdfs: number;
  };
}

interface PDF {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  page_count: number | null;
  library_id: string;
  user_id: string;
  upload_date: string;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<
    "profiles" | "home" | "libraries" | "chat"
  >("profiles");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(
    null
  );
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [libraryPdfs, setLibraryPdfs] = useState<Record<string, PDF[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleViewChange = (
    view: "profiles" | "home" | "libraries" | "chat"
  ) => {
    setCurrentView(view);
    setSelectedLibrary(null);
  };

  const openLibrary = (library: Library) => {
    setSelectedLibrary(library);
    setCurrentView("libraries");
  };

  const openChat = () => {
    setSelectedLibrary(null);
    setCurrentView("chat");
  };

  const handleLibraryBack = () => {
    setSelectedLibrary(null);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowProfileDropdown(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const fetchLibraries = async () => {
    if (!user) return;

    try {
      const { data: librariesData, error } = await supabase
        .from('libraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const librariesWithCount = await Promise.all(
        (librariesData || []).map(async (lib) => {
          const { count } = await supabase
            .from('pdfs')
            .select('*', { count: 'exact', head: true })
            .eq('library_id', lib.id);

          return {
            ...lib,
            _count: { pdfs: count || 0 }
          };
        })
      );

      setLibraries(librariesWithCount);

      // Fetch PDFs for each library
      const pdfsByLib: Record<string, PDF[]> = {};
      await Promise.all(
        librariesWithCount.map(async (lib) => {
          const { data: pdfsData } = await supabase
            .from('pdfs')
            .select('*')
            .eq('library_id', lib.id)
            .order('upload_date', { ascending: false });

          pdfsByLib[lib.id] = pdfsData || [];
        })
      );
      setLibraryPdfs(pdfsByLib);
    } catch (error) {
      console.error("Error loading libraries:", error);
      toast.error("Failed to load libraries");
    }
  };

  useEffect(() => {
    if (user) {
      fetchLibraries();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-red-600 text-4xl font-bold mb-4">PDFlix</div>
          <div className="text-white text-xl">Loading your libraries...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const filteredLibraries = libraries.filter(lib =>
    lib.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lib.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const carouselLibraries = filteredLibraries.map((lib) => ({
    id: lib.id,
    name: lib.name,
    description: lib.description || "",
    pdfCount: libraryPdfs[lib.id]?.length ?? 0,
    image: "",
    pdfs: (libraryPdfs[lib.id] ?? []).slice(0, 3).map((pdf) => ({
      id: pdf.id,
      title: pdf.title,
      author: "",
      pages: pdf.page_count || 0,
    })),
  }));

  const popularLibs = carouselLibraries.slice(0, 3);
  const recentLibs = carouselLibraries.slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      {/* Netflix Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-16 py-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent transition-all duration-500 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <h1 className="text-red-600 text-2xl md:text-3xl font-bold tracking-wider hover:scale-105 transition-transform duration-300 cursor-pointer">
              PDFlix
            </h1>
            {currentView !== "profiles" && (
              <div className="hidden md:flex space-x-6 text-sm">
                <Button
                  variant="ghost"
                  onClick={() => handleViewChange("home")}
                  className={`text-white hover:text-gray-300 p-0 h-auto font-normal transition-all duration-300 hover:scale-105 ${
                    currentView === "home" ? "font-semibold border-b-2 border-red-600" : ""
                  }`}
                >
                  Home
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleViewChange("libraries")}
                  className={`text-white hover:text-gray-300 p-0 h-auto font-normal transition-all duration-300 hover:scale-105 ${
                    currentView === "libraries" ? "font-semibold border-b-2 border-red-600" : ""
                  }`}
                >
                  Libraries
                </Button>
              </div>
            )}
          </div>

          {/* Right Side - Search, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              {showSearch ? (
                <div className="flex items-center bg-black/50 border border-gray-600 rounded-md px-3 py-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Search libraries..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-transparent text-white placeholder-gray-400 outline-none w-64"
                    autoFocus
                    onBlur={() => {
                      if (!searchQuery) setShowSearch(false);
                    }}
                  />
                  <Search className="w-4 h-4 text-gray-400 ml-2" />
                </div>
              ) : (
                <Search 
                  className="w-5 h-5 text-white cursor-pointer hover:text-gray-300 transition-all duration-300 hover:scale-110" 
                  onClick={() => setShowSearch(true)}
                />
              )}
            </div>

            <Bell className="w-5 h-5 text-white cursor-pointer hover:text-gray-300 transition-all duration-300 hover:scale-110" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 hover:text-gray-300 transition-all duration-300 hover:scale-105 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded flex items-center justify-center shadow-lg group-hover:shadow-red-600/30">
                  <User className="w-4 h-4" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 top-12 w-48 bg-black/95 border border-gray-700 rounded-md py-2 z-50 backdrop-blur-sm animate-fade-in shadow-2xl">
                  <button
                    onClick={() => {
                      handleViewChange("profiles");
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-600/20 transition-all duration-300"
                  >
                    Switch Libraries
                  </button>
                  <div className="border-t border-gray-700 my-2"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 hover:bg-red-600/20 transition-all duration-300"
                  >
                    Sign out of PDFlix
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative pt-20 px-4 md:px-16 pb-20">
        {currentView === "profiles" && (
          <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
            <LibraryProfiles
              libraries={libraries}
              onLibrarySelect={(library) => {
                setSelectedLibrary(library);
                handleViewChange("home");
              }}
              onCreateNew={() => handleViewChange("libraries")}
              onClose={() => handleViewChange("home")}
              onLibraryCreated={fetchLibraries}
            />
          </div>
        )}

        {currentView === "home" && (
          <div className="animate-fade-in">
            <HeroSection onStartChat={openChat} />
            <div className="relative z-10">
              <div className="space-y-12">
                <LibraryCarousel
                  libraries={popularLibs}
                  title="Popular Libraries"
                  onLibraryClick={openLibrary}
                />
                <LibraryCarousel
                  libraries={recentLibs}
                  title="Recently Added"
                  onLibraryClick={openLibrary}
                />
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
                    Recently Read
                  </h2>
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4">
                    {carouselLibraries
                      .flatMap((lib) => lib.pdfs)
                      .slice(0, 8)
                      .map((pdf) => (
                        <Card
                          key={pdf.id}
                          className="bg-transparent border-none hover:scale-105 transition-transform duration-300 cursor-pointer group"
                        >
                          <CardContent className="p-0">
                            <div className="aspect-[3/4] bg-gradient-to-br from-red-900 to-red-600 rounded-md flex items-center justify-center relative overflow-hidden shadow-lg group-hover:shadow-red-600/30">
                              <span className="text-white font-bold text-xs text-center px-2 leading-tight">
                                {pdf.title}
                              </span>
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

        {currentView === "libraries" && !selectedLibrary && (
          <div className="animate-fade-in">
            <LibraryManager onLibrarySelect={openLibrary} onLibraryCreated={fetchLibraries} />
          </div>
        )}

        {currentView === "libraries" && selectedLibrary && (
          <div className="animate-fade-in">
            <LibraryView library={selectedLibrary} onBack={handleLibraryBack} />
          </div>
        )}

        {currentView === "chat" && (
          <div className="animate-fade-in">
            <ChatInterface selectedLibrary={selectedLibrary} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
