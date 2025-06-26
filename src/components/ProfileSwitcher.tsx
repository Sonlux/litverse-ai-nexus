
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Plus } from "lucide-react";

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
    { id: '1', name: 'Alex', avatar: '👨‍💻', color: 'from-purple-500 to-blue-500' },
    { id: '2', name: 'Sarah', avatar: '👩‍🎓', color: 'from-pink-500 to-red-500' },
    { id: '3', name: 'Mike', avatar: '👨‍🔬', color: 'from-green-500 to-teal-500' },
    { id: '4', name: 'Emma', avatar: '👩‍💼', color: 'from-yellow-500 to-orange-500' },
  ];

  const handleProfileSelect = (profileName: string) => {
    onProfileSelect(profileName);
    onClose();
  };

  return (
    <div className="max-w-6xl mx-auto text-center">
      <h2 className="text-4xl font-bold text-white mb-4">Who's reading?</h2>
      <p className="text-slate-400 mb-12">Select your profile to continue</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
        {profiles.map((profile) => (
          <Card
            key={profile.id}
            className={`bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 cursor-pointer group ${
              selectedProfile === profile.name ? 'ring-2 ring-purple-400' : ''
            }`}
            onClick={() => handleProfileSelect(profile.name)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${profile.color} flex items-center justify-center text-3xl shadow-lg`}>
                {profile.avatar}
              </div>
              <h3 className="text-white font-medium group-hover:text-purple-300 transition-colors">
                {profile.name}
              </h3>
            </CardContent>
          </Card>
        ))}
        
        {/* Add Profile Card */}
        <Card className="bg-slate-800/30 border-slate-600 border-dashed hover:bg-slate-700/30 transition-all duration-300 cursor-pointer">
          <CardContent className="p-6 text-center h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-400 font-medium">Add Profile</h3>
          </CardContent>
        </Card>
      </div>
      
      <Button
        onClick={onClose}
        variant="outline"
        className="mt-12 border-slate-600 text-slate-400 hover:bg-slate-700/50"
      >
        Continue as Guest
      </Button>
    </div>
  );
};

export default ProfileSwitcher;
