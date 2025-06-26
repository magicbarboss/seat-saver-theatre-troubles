
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      console.log('Attempting sign up with email:', email);
      
      // First check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        return { error: { message: 'Username already exists' } };
      }

      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            full_name: fullName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      console.log('Sign up result:', error);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created successfully!",
          description: "You can now sign in with your credentials.",
        });
      }

      return { error };
    } catch (error: any) {
      console.log('Sign up catch error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Sign in attempt with email:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log('Sign in result:', error);

      if (error) {
        let errorMessage = "Sign in failed";
        
        if (error.message === "Email not confirmed") {
          errorMessage = "Please check your email and click the confirmation link before signing in.";
        } else if (error.message === "Invalid login credentials") {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else {
          errorMessage = error.message;
        }

        toast({
          title: "Sign in failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
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
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
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
