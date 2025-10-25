import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PetitionCard } from "@/components/PetitionCard";
import { fetchPetitions } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");

  // Fetch data using useQuery
  const { data: petitions, isLoading } = useQuery({
    queryKey: ['petitions'],
    queryFn: fetchPetitions,
  });

  // Fallback to empty array if data is loading or null
  const activePetitions = petitions || [];

  // Get unique brands - CRITICAL FIX: Filter out null/empty strings before rendering
  const brands = useMemo(() => {
    return Array.from(new Set(activePetitions
        .map(p => p.brand)
        // Filter out any brand name that evaluates to false (e.g., "", null, undefined)
        .filter(brand => brand) 
    )).sort();
  }, [activePetitions]);

  // Filter petitions
  const filteredPetitions = useMemo(() => {
    if (activePetitions.length === 0) return [];

    return activePetitions.filter(petition => {
      const matchesSearch = petition.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          petition.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = selectedBrand === "all" || petition.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [searchQuery, selectedBrand, activePetitions]);

  // Skeleton loading component for cards
  const LoadingSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-4 rounded-lg border p-6">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-4 pt-2">
             <Skeleton className="h-4 w-1/3" />
             <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      
      <main className="container py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Active Investigations</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Brands currently under observation for consumer protection violations
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by brand name or investigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Ensure the Select dropdown handles loading and is disabled if no brands exist */}
          <Select 
            value={selectedBrand} 
            onValueChange={setSelectedBrand} 
            disabled={isLoading || brands.length === 0} 
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Display Loading Skeletons */}
        {isLoading && <LoadingSkeletons />}

        {/* Display Filtered Petitions or Not Found message */}
        {!isLoading && filteredPetitions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPetitions.map((petition) => (
              // Note: PetitionCard uses the live petition.id for routing
              <PetitionCard key={petition.id} petition={petition} />
            ))}
          </div>
        )}

        {!isLoading && filteredPetitions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {activePetitions.length === 0
                ? "No active investigations have been published yet."
                : "No investigations found matching your search."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;