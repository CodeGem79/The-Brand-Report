import { AlertTriangle } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary opacity-90" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Consumer Advocacy Platform</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Holding Brands Accountable
          </h1>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            The Brand Report is a vigilant observer of corporate practices. We investigate consumer complaints, 
            track patterns of misconduct, and provide a platform for collective action.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <div className="text-center sm:text-left">
              <div className="text-3xl md:text-4xl font-bold text-accent">2,612</div>
              <div className="text-sm text-primary-foreground/70">Active Supporters</div>
            </div>
            <div className="hidden sm:block w-px bg-primary-foreground/20" />
            <div className="text-center sm:text-left">
              <div className="text-3xl md:text-4xl font-bold text-accent">3</div>
              <div className="text-sm text-primary-foreground/70">Active Investigations</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
