
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, BookOpen, FileText, Users, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Library {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  _count?: {
    pdfs: number;
  };
}

interface LibraryProfilesProps {
  libraries: Library[];
  onLibrarySelect: (library: Library) => void;
  onCreateNew: () => void;
  onClose: () => void;
  onLibraryCreated: () => void;
}

const LibraryProfiles = ({ libraries, onLibrarySelect, onCreateNew, onClose, onLibraryCreated }: LibraryProfilesProps) => {
  const [hoveredLibrary, setHoveredLibrary] = useState<string | null>(null);
  const [deletingLibrary, setDeletingLibrary] = useState<string | null>(null);

  // Netflix-style colorful gradient backgrounds with icons
  const libraryStyles = [
    { 
      icon: BookOpen, 
      gradient: 'from-red-500 via-red-600 to-red-700',
      shadow: 'shadow-red-500/30',
      hoverShadow: 'group-hover:shadow-red-500/60'
    },
    { 
      icon: FileText, 
      gradient: 'from-amber-500 via-orange-500 to-yellow-600',
      shadow: 'shadow-orange-500/30',
      hoverShadow: 'group-hover:shadow-orange-500/60'
    },
    { 
      icon: Users, 
      gradient: 'from-blue-500 via-cyan-500 to-teal-600',
      shadow: 'shadow-blue-500/30',
      hoverShadow: 'group-hover:shadow-blue-500/60'
    },
    { 
      icon: Sparkles, 
      gradient: 'from-purple-500 via-violet-600 to-indigo-700',
      shadow: 'shadow-purple-500/30',
      hoverShadow: 'group-hover:shadow-purple-500/60'
    },
    { 
      icon: Zap, 
      gradient: 'from-green-500 via-emerald-600 to-teal-700',
      shadow: 'shadow-green-500/30',
      hoverShadow: 'group-hover:shadow-green-500/60'
    },
  ];

  const handleDeleteLibrary = async (libraryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this library? This will also delete all PDFs and chats.")) {
      return;
    }

    try {
      setDeletingLibrary(libraryId);
      
      // Delete the library - this will cascade delete PDFs, chat sessions, and messages
      const { error } = await supabase
        .from('libraries')
        .delete()
        .eq('id', libraryId);

      if (error) throw error;

      toast.success("Library deleted successfully");
      onLibraryCreated(); // Refresh the libraries list
    } catch (error) {
      console.error("Error deleting library:", error);
      toast.error("Failed to delete library");
    } finally {
      setDeletingLibrary(null);
    }
  };

  const canCreateNew = libraries.length < 5;

  return (
    <div className="max-w-6xl mx-auto text-center px-4 animate-fade-in">
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-light text-white mb-4 animate-slide-up">
          Who's reading?
        </h1>
        <p className="text-gray-400 text-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Select a library to continue your reading journey
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
        {libraries.map((library, index) => {
          const styleData = libraryStyles[index % libraryStyles.length];
          const IconComponent = styleData.icon;
          
          return (
            <div
              key={library.id}
              className="cursor-pointer group transition-all duration-500 hover:scale-110 relative animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onLibrarySelect(library)}
              onMouseEnter={() => setHoveredLibrary(library.id)}
              onMouseLeave={() => setHoveredLibrary(null)}
            >
              <div className="relative">
                {/* Netflix-style colorful icon */}
                <div className={`
                  w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-xl 
                  bg-gradient-to-br ${styleData.gradient} 
                  flex items-center justify-center 
                  transition-all duration-500 
                  shadow-2xl ${styleData.shadow} ${styleData.hoverShadow}
                  transform-gpu
                  group-hover:rotate-2 group-hover:scale-105
                  before:absolute before:inset-0 before:rounded-xl 
                  before:bg-gradient-to-br before:from-white/20 before:to-transparent 
                  before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300
                `}>
                  <IconComponent className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-lg relative z-10" />
                  
                  {/* PDF count overlay */}
                  {hoveredLibrary === library.id && (
                    <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center animate-fade-in">
                      <div className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                        {library._count?.pdfs || 0} PDFs
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Netflix-style edit/delete buttons */}
                {hoveredLibrary === library.id && (
                  <div className="absolute -top-2 -right-2 flex space-x-1 animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Edit functionality coming soon!");
                      }}
                      className="w-7 h-7 bg-black/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black hover:scale-110 border border-white/20"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteLibrary(library.id, e)}
                      disabled={deletingLibrary === library.id}
                      className="w-7 h-7 bg-red-600/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:scale-110 disabled:opacity-50 border border-red-400/20"
                    >
                      {deletingLibrary === library.id ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      ) : (
                        <Trash2 className="w-3 h-3 text-white" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Library name with Netflix styling */}
              <h3 className="text-white text-lg md:text-xl font-normal group-hover:text-gray-300 transition-all duration-300 mb-2 truncate px-2">
                {library.name}
              </h3>
              
              {/* Description */}
              {library.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {library.description}
                </p>
              )}
              
              {/* Tags */}
              {library.tags && library.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {library.tags.slice(0, 2).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add Library Card */}
        {canCreateNew && (
          <div 
            className="cursor-pointer group transition-all duration-500 hover:scale-110 animate-scale-in"
            style={{ animationDelay: `${libraries.length * 0.1}s` }}
            onClick={onCreateNew}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-xl bg-transparent border-2 border-dashed border-gray-600 flex items-center justify-center transition-all duration-500 group-hover:border-white group-hover:bg-white/5 shadow-lg group-hover:shadow-white/20">
              <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-gray-400 text-lg md:text-xl font-normal group-hover:text-white transition-colors duration-300">
              Add Library
            </h3>
            <p className="text-gray-600 text-sm mt-1 group-hover:text-gray-400 transition-colors duration-300">
              {5 - libraries.length} slots remaining
            </p>
          </div>
        )}
        
        {/* Limit reached card */}
        {!canCreateNew && (
          <div className="opacity-50 cursor-not-allowed animate-scale-in" style={{ animationDelay: `${libraries.length * 0.1}s` }}>
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-xl bg-gray-800/50 border-2 border-gray-700 flex items-center justify-center">
              <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-700" />
            </div>
            <h3 className="text-gray-600 text-lg md:text-xl font-normal">
              Limit Reached
            </h3>
            <p className="text-gray-700 text-sm mt-1">
              Delete a library to add new one
            </p>
          </div>
        )}
      </div>
      
      <Button
        onClick={onClose}
        variant="outline"
        className="border-gray-600 text-gray-400 hover:bg-transparent hover:border-white hover:text-white bg-transparent text-lg px-8 py-3 transition-all duration-500 hover:scale-105 animate-fade-in"
        style={{ animationDelay: '0.6s' }}
      >
        CONTINUE TO MAIN
      </Button>
    </div>
  );
};

export default LibraryProfiles;
