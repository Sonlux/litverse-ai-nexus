
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Library, FileText, ChevronRight } from "lucide-react";

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
}

const LibraryCarousel = ({ libraries, showAll = false }: LibraryCarouselProps) => {
  return (
    <div className="space-y-12">
      {libraries.map((library) => (
        <div key={library.id} className="space-y-4">
          {/* Library Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Library className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-xl font-bold text-white">{library.name}</h3>
                <p className="text-slate-400">{library.description}</p>
              </div>
            </div>
            <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* PDF Carousel */}
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {library.pdfs.map((pdf) => (
              <Card 
                key={pdf.id} 
                className="flex-shrink-0 w-48 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="aspect-[3/4] bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    <FileText className="w-12 h-12 text-white/80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-white font-medium text-xs leading-tight line-clamp-2">
                        {pdf.title}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition-colors">
                      {pdf.title}
                    </h4>
                    <p className="text-slate-400 text-xs truncate">{pdf.author}</p>
                    <p className="text-slate-500 text-xs">{pdf.pages} pages</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add PDF Card */}
            <Card className="flex-shrink-0 w-48 bg-slate-800/30 border-slate-600 border-dashed hover:bg-slate-700/30 transition-all duration-300 cursor-pointer">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-1">Add PDF</p>
                <p className="text-slate-500 text-xs">Upload to {library.name}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LibraryCarousel;
