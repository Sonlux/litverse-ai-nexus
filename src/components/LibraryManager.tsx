
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Library, BookOpen, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from 'sonner';

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

interface LibraryManagerProps {
  onLibrarySelect: (library: Library) => void;
  onLibraryCreated?: () => void;
}

const LibraryManager = ({ onLibrarySelect, onLibraryCreated }: LibraryManagerProps) => {
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLibraries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const librariesWithCount = await Promise.all(
        (data || []).map(async (lib) => {
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
    } catch (error) {
      console.error("Error loading libraries:", error);
      toast.error("Failed to load libraries");
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, [user]);

  const handleCreateLibrary = async () => {
    if (!formData.name.trim()) {
      toast.error("Library name is required");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('libraries')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Library created successfully!");
      setFormData({ name: "", description: "", tags: [] });
      setShowCreateForm(false);
      
      // Refresh libraries
      await fetchLibraries();
      
      // Notify parent component
      if (onLibraryCreated) {
        onLibraryCreated();
      }
    } catch (error: any) {
      console.error("Error creating library:", error);
      if (error.code === '23505') {
        toast.error("A library with this name already exists");
      } else {
        toast.error("Failed to create library");
      }
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const canCreateNew = libraries.length < 5;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Libraries</h1>
          <p className="text-gray-400">Manage your PDF collections</p>
        </div>
        {canCreateNew && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-red-600 hover:bg-red-700 px-6 py-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Library
          </Button>
        )}
      </div>

      {/* Create Library Form */}
      {showCreateForm && (
        <Card className="bg-gray-900 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Library className="w-5 h-5 mr-2" />
              Create New Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Library Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter library name..."
                className="bg-gray-800 border-gray-600 text-white"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your library..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="bg-gray-800 border-gray-600 text-white flex-1"
                  maxLength={20}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button
                  type="button"
                  onClick={addTag}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-gray-700 text-gray-200 hover:bg-gray-600"
                    >
                      {tag}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateLibrary}
                disabled={loading || !formData.name.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? "Creating..." : "Create Library"}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Libraries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {libraries.map((library) => (
          <Card
            key={library.id}
            className="bg-gray-900 border-gray-700 hover:bg-gray-800 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-2xl hover:shadow-red-600/20"
            onClick={() => onLibrarySelect(library)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg group-hover:text-red-300 transition-colors">
                      {library.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {library._count?.pdfs || 0} PDFs
                    </p>
                  </div>
                </div>
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
              </div>

              {library.description && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {library.description}
                </p>
              )}

              {library.tags && library.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {library.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-gray-800 text-gray-300 text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {library.tags.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="bg-gray-800 text-gray-300 text-xs"
                    >
                      +{library.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Create New Library Card */}
        {canCreateNew && !showCreateForm && (
          <Card
            className="bg-gray-900/50 border-gray-700 border-dashed hover:bg-gray-800/50 transition-all duration-300 cursor-pointer group hover:scale-105"
            onClick={() => setShowCreateForm(true)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                <Plus className="w-8 h-8 text-gray-400 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-gray-400 group-hover:text-white transition-colors">
                Create New Library
              </h3>
              <p className="text-gray-500 text-sm mt-2 text-center">
                {5 - libraries.length} slots remaining
              </p>
            </CardContent>
          </Card>
        )}

        {/* Limit Reached Card */}
        {!canCreateNew && (
          <Card className="bg-gray-900/30 border-gray-700 opacity-50">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-600">
                Library Limit Reached
              </h3>
              <p className="text-gray-700 text-sm mt-2 text-center">
                Delete a library to create a new one
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LibraryManager;
