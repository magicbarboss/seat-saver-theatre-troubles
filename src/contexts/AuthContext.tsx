
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (username: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (username: string, password: string, fullName: string) => {
    try {
      // Clean the username and ensure it's valid for email format
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '');
      console.log('Cleaned username:', cleanUsername);
      
      // First check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        return { error: { message: 'Username already exists' } };
      }

      // Create email using a standard format
      const fakeEmail = `${cleanUsername}@example.com`;
      console.log('Generated email:', fakeEmail);
      
      const { error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          data: {
            username,
            full_name: fullName
          }
        }
      });

      console.log('Sign up error:', error);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created",
          description: "You can now sign in with your username and password.",
        });
      }

      return { error };
    } catch (error: any) {
      console.log('Sign up catch error:', error);
      return { error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '');
      const fakeEmail = `${cleanUsername}@example.com`;
      console.log('Sign in with email:', fakeEmail);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      console.log('Sign in error:', error);

      if (error) {
        toast({
          title: "Sign in failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      }

      return { error };
    } catch (error: any) {
      console.log('Sign in catch error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signUp,
      signIn,
      signOut,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
