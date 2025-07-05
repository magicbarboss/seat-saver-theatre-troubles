import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle } from 'lucide-react';

const LogoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `smoke-mirrors-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          upsert: true, // Replace if exists
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploaded(true);
      toast({
        title: "Logo uploaded successfully!",
        description: "Your logo is now available in the app.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Upload className="h-5 w-5" />
          Upload Logo
        </CardTitle>
        <CardDescription>
          Upload your Smoke & Mirrors Comedy & Magic Theatre logo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploaded ? (
          <>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Click to select your logo image
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full cursor-pointer"
              />
            </div>
            {uploading && (
              <p className="text-center text-sm text-muted-foreground">
                Uploading your logo...
              </p>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <p className="text-sm font-medium">Logo uploaded successfully!</p>
            <p className="text-xs text-muted-foreground">
              Your logo will now appear throughout the app. You can close this page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogoUpload;