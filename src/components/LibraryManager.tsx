import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FolderOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import { LibraryAPI, Library } from "@/services/api";

interface LibraryManagerProps {
  onLibrarySelect: (library: Library) => void;
}

const LibraryManager = ({ onLibrarySelect }: LibraryManagerProps) => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const data = await LibraryAPI.getAll();
      setLibraries(data);
    } catch (error) {
      console.error("Error fetching libraries:", error);
      toast.error("Failed to load libraries");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      if (editingLibrary) {
        await LibraryAPI.update(Number(editingLibrary.id), {
          name: formData.name,
          description: formData.description || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        });
        toast.success("Library updated successfully");
      } else {
        await LibraryAPI.create({
          name: formData.name,
          description: formData.description || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        });
        toast.success("Library created successfully");
      }

      setIsDialogOpen(false);
      setEditingLibrary(null);
      setFormData({ name: "", description: "", tags: "" });
      fetchLibraries();
    } catch (error) {
      console.error("Error saving library:", error);
      toast.error("Failed to save library");
    }
  };

  const handleEdit = (library: Library) => {
    setEditingLibrary(library);
    setFormData({
      name: library.name,
      description: library.description || "",
      tags: library.tags?.join(", ") || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (libraryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this library? This will also delete all PDFs and chats."
      )
    ) {
      return;
    }

    try {
      await LibraryAPI.delete(Number(libraryId));
      toast.success("Library deleted successfully");
      fetchLibraries();
    } catch (error) {
      console.error("Error deleting library:", error);
      toast.error("Failed to delete library");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading libraries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Libraries</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              New Library
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingLibrary ? "Edit Library" : "Create New Library"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Library Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-gray-800 border-gray-600"
                required
              />
              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-gray-800 border-gray-600"
              />
              <Input
                placeholder="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="bg-gray-800 border-gray-600"
              />
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {editingLibrary ? "Update Library" : "Create Library"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {libraries.length === 0 ? (
          <div className="col-span-full text-center text-gray-400">
            <p>No libraries found. Create your first library to get started.</p>
          </div>
        ) : (
          libraries.map((library) => (
            <Card
              key={library.id}
              className="bg-gray-900 border-gray-700 hover:border-red-500 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">
                    {library.name}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(library)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(library.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {library.description && (
                  <p className="text-gray-400 text-sm mb-3">
                    {library.description}
                  </p>
                )}

                {library.tags && library.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {library.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-gray-800 text-gray-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                  <span>{library._count?.pdfs || 0} PDFs</span>
                  <span>
                    {new Date(library.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => onLibrarySelect(library)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LibraryManager;
