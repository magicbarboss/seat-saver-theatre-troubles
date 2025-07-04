-- Create a public storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Create policies for public access to images
CREATE POLICY "Images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);