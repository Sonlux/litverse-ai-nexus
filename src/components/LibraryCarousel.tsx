import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

interface PDF {
  id: string;
  title: string;
  author: string;
  pages: number;
}

interface Library {
  id: string;
  name: string;
  description: string;
  pdfCount: number;
  image: string;
  pdfs: PDF[];
}

interface LibraryCarouselProps {
  libraries: Library[];
  showAll?: boolean;
  title?: string;
  onLibraryClick?: (library: Library) => void;
}

const LibraryCarousel = ({
  libraries,
  showAll = false,
  title,
  onLibraryClick,
}: LibraryCarouselProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {libraries.map((library) => (
        <div key={library.id} className="space-y-4">
          {/* Netflix-style section header */}
          <div className="flex items-center justify-between px-4 md:px-0">
            <h3
              className="text-xl md:text-2xl font-semibold text-white hover:text-gray-300 transition-colors cursor-pointer"
              onClick={() => onLibraryClick && onLibraryClick(library)}
            >
              {title || library.name}
            </h3>
            <Button
              variant="ghost"
              onClick={() => onLibraryClick && onLibraryClick(library)}
              className="text-blue-400 hover:text-blue-300 p-0 h-auto text-sm font-normal opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Explore All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Netflix-style horizontal scroll */}
          <div className="group relative">
            <div className="flex space-x-1 md:space-x-2 overflow-x-auto scrollbar-hide px-4 md:px-0 pb-4">
              {library.pdfs.map((pdf, index) => (
                <div
                  key={pdf.id}
                  className="flex-shrink-0 w-32 md:w-48 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 relative"
                  onMouseEnter={() => setHoveredItem(pdf.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Main card */}
                  <Card className="bg-transparent border-none overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-[16/9] bg-gradient-to-br from-red-900 via-red-700 to-red-500 rounded-md flex items-center justify-center relative overflow-hidden">
                        <span className="text-white font-bold text-xs md:text-sm text-center px-2 leading-tight">
                          {pdf.title}
                        </span>
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300"></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Netflix-style hover card */}
                  {hoveredItem === pdf.id && (
                    <div className="absolute top-0 left-0 right-0 bg-gray-900 rounded-md shadow-2xl border border-gray-700 p-4 transform scale-110 z-20 transition-all duration-200">
                      <div className="aspect-[16/9] bg-gradient-to-br from-red-900 via-red-700 to-red-500 rounded-md flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-sm text-center px-2">
                          {pdf.title}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <span className="text-black text-lg">▶</span>
                          </button>
                          <button className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white transition-colors">
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        <h4 className="text-white text-sm font-semibold">
                          {pdf.title}
                        </h4>
                        <p className="text-gray-400 text-xs">{pdf.author}</p>
                        <p className="text-gray-500 text-xs">
                          {pdf.pages} pages
                        </p>

                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span className="border border-gray-500 px-1">
                            PDF
                          </span>
                          <span>Educational</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* View All Card */}
              <div className="flex-shrink-0 w-32 md:w-48">
                <Card
                  className="bg-gray-900/50 border-gray-700 border-dashed hover:bg-gray-800/50 transition-all duration-300 cursor-pointer h-full"
                  onClick={() => onLibraryClick && onLibraryClick(library)}
                >
                  <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-3">
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">
                      View All
                    </p>
                    <p className="text-gray-500 text-xs">
                      {library.pdfCount} PDFs
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LibraryCarousel;
