
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, BookOpen, FileText, Users } from "lucide-react";
import { Library as ApiLibrary } from "@/services/api";
import { toast } from "sonner";
import { LibraryAPI } from "@/services/api";

interface LibraryProfilesProps {
  libraries: ApiLibrary[];
  onLibrarySelect: (library: ApiLibrary) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const LibraryProfiles = ({ libraries, onLibrarySelect, onCreateNew, onClose }: LibraryProfilesProps) => {
  const [hoveredLibrary, setHoveredLibrary] = useState<string | null>(null);
  const [deletingLibrary, setDeletingLibrary] = useState<string | null>(null);

  const libraryIcons = [
    { icon: BookOpen, color: 'from-red-600 to-red-800' },
    { icon: FileText, color: 'from-blue-600 to-blue-800' },
    { icon: Users, color: 'from-green-600 to-green-800' },
    { icon: BookOpen, color: 'from-purple-600 to-purple-800' },
    { icon: FileText, color: 'from-orange-600 to-orange-800' },
  ];

  const handleDeleteLibrary = async (libraryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this library? This will also delete all PDFs and chats.")) {
      return;
    }

    try {
      setDeletingLibrary(libraryId);
      await LibraryAPI.delete(Number(libraryId));
      toast.success("Library deleted successfully");
      // Refresh libraries - in a real app, you'd want to update the parent state
      window.location.reload();
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
      <h1 className="text-4xl md:text-6xl font-light text-white mb-2">Choose your library</h1>
      <p className="text-gray-400 text-lg mb-12">Select a library to continue your reading journey</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
        {libraries.map((library, index) => {
          const iconData = libraryIcons[index % libraryIcons.length];
          const IconComponent = iconData.icon;
          
          return (
            <div
              key={library.id}
              className="cursor-pointer group transition-all duration-300 hover:scale-105 relative"
              onClick={() => onLibrarySelect(library)}
              onMouseEnter={() => setHoveredLibrary(library.id)}
              onMouseLeave={() => setHoveredLibrary(null)}
            >
              <div className="relative">
                <div className={`w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-lg bg-gradient-to-br ${iconData.color} flex items-center justify-center transition-all duration-300 group-hover:ring-4 group-hover:ring-white/50 shadow-2xl group-hover:shadow-red-600/30`}>
                  <IconComponent className="w-8 h-8 md:w-12 md:h-12 text-white" />
                  {hoveredLibrary === library.id && (
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <div className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">
                        {library._count?.pdfs || 0} PDFs
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Netflix-style edit/delete icons on hover */}
                {hoveredLibrary === library.id && (
                  <div className="absolute top-0 right-0 flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Edit functionality coming soon!");
                      }}
                      className="w-6 h-6 bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black hover:scale-110"
                    >
                      <Edit className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteLibrary(library.id, e)}
                      disabled={deletingLibrary === library.id}
                      className="w-6 h-6 bg-red-600/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-600 hover:scale-110 disabled:opacity-50"
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
              
              <h3 className="text-white text-lg md:text-xl font-light group-hover:text-gray-300 transition-colors truncate">
                {library.name}
              </h3>
              {library.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  {library.description}
                </p>
              )}
              
              {/* Tags */}
              {library.tags && library.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {library.tags.slice(0, 2).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add Library */}
        {canCreateNew && (
          <div 
            className="cursor-pointer group transition-all duration-300 hover:scale-105"
            onClick={onCreateNew}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-lg bg-transparent border-2 border-gray-600 border-dashed flex items-center justify-center transition-all duration-300 group-hover:border-white group-hover:bg-white/5">
              <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-gray-400 text-lg md:text-xl font-light group-hover:text-white transition-colors">
              Add Library
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {5 - libraries.length} slots remaining
            </p>
          </div>
        )}
        
        {!canCreateNew && (
          <div className="opacity-50 cursor-not-allowed">
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-lg bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
              <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-700" />
            </div>
            <h3 className="text-gray-600 text-lg md:text-xl font-light">
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
        className="border-gray-600 text-gray-400 hover:bg-transparent hover:border-white hover:text-white bg-transparent text-lg px-8 py-3 transition-all duration-300 hover:scale-105"
      >
        CONTINUE TO MAIN
      </Button>
    </div>
  );
};

export default LibraryProfiles;
