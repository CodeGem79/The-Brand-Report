import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PetitionCard } from "@/components/PetitionCard";
import { mockPetitions } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");

  // Get unique brands
  const brands = useMemo(() => {
    return Array.from(new Set(mockPetitions.map(p => p.brand))).sort();
  }, []);

  // Filter petitions
  const filteredPetitions = useMemo(() => {
    return mockPetitions.filter(petition => {
      const matchesSearch = petition.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          petition.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = selectedBrand === "all" || petition.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [searchQuery, selectedBrand]);

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
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPetitions.map((petition) => (
            <PetitionCard key={petition.id} petition={petition} />
          ))}
        </div>

        {filteredPetitions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No investigations found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
