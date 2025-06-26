
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface ProfileSwitcherProps {
  selectedProfile: string;
  onProfileSelect: (profileName: string) => void;
  onClose: () => void;
}

const ProfileSwitcher = ({ selectedProfile, onProfileSelect, onClose }: ProfileSwitcherProps) => {
  const profiles: Profile[] = [
    { id: '1', name: 'Alex', avatar: '👨‍💻', color: 'from-red-600 to-red-800' },
    { id: '2', name: 'Sarah', avatar: '👩‍🎓', color: 'from-blue-600 to-blue-800' },
    { id: '3', name: 'Mike', avatar: '👨‍🔬', color: 'from-green-600 to-green-800' },
    { id: '4', name: 'Emma', avatar: '👩‍💼', color: 'from-purple-600 to-purple-800' },
  ];

  const handleProfileSelect = (profileName: string) => {
    onProfileSelect(profileName);
    onClose();
  };

  return (
    <div className="max-w-4xl mx-auto text-center px-4">
      <h1 className="text-4xl md:text-6xl font-light text-white mb-8">Who's reading?</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto mb-12">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="cursor-pointer group transition-all duration-300 hover:scale-105"
            onClick={() => handleProfileSelect(profile.name)}
          >
            <div className="relative">
              <div className={`w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-lg bg-gradient-to-br ${profile.color} flex items-center justify-center text-4xl md:text-5xl transition-all duration-300 group-hover:ring-4 group-hover:ring-white`}>
                {profile.avatar}
              </div>
              
              {/* Netflix-style edit icon on hover */}
              <div className="absolute top-0 right-0 w-6 h-6 bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Edit className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <h3 className="text-white text-lg md:text-xl font-light group-hover:text-gray-300 transition-colors">
              {profile.name}
            </h3>
          </div>
        ))}
        
        {/* Add Profile */}
        <div className="cursor-pointer group transition-all duration-300 hover:scale-105">
          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-lg bg-transparent border-2 border-gray-600 flex items-center justify-center transition-all duration-300 group-hover:border-white">
            <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-gray-400 text-lg md:text-xl font-light group-hover:text-white transition-colors">
            Add Profile
          </h3>
        </div>
      </div>
      
      <Button
        onClick={onClose}
        variant="outline"
        className="border-gray-600 text-gray-400 hover:bg-transparent hover:border-white hover:text-white bg-transparent text-lg px-8 py-3"
      >
        MANAGE PROFILES
      </Button>
    </div>
  );
};

export default ProfileSwitcher;
