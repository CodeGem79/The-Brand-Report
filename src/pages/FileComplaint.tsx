import { useState, useEffect } from "react"; // [MODIFIED] Added useEffect
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Import Firebase dependency
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { Link } from "react-router-dom"; // Assuming Link is used for navigation away from the page


export default function FileComplaint() {
  const { toast } = useToast();
  
  // [NEW HOOK] Auto-scroll to the top of the page on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); // Empty dependency array ensures this runs only once on mount

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    brandName: "",
    category: "",
    amount: "",
    issueDescription: "",
    desiredOutcome: "",
    status: "New", // Default status for new reports
    verification_level: "Unverified"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };
  
  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, category: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        submittedAt: serverTimestamp(),
      };
      
      // Send data to the 'incident_reports' collection
      await addDoc(collection(db, "incident_reports"), dataToSubmit);
      
      toast({
        title: "Report Filed",
        description: "Your report has been successfully filed and is pending review.",
      });

      // Reset form (except category, which is often kept)
      setFormData({
        name: "",
        email: "",
        phone: "",
        brandName: "",
        category: formData.category,
        amount: "",
        issueDescription: "",
        desiredOutcome: "",
        status: "New", 
        verification_level: "Unverified"
      });
      
    } catch (error) {
      console.error("Error submitting report: ", error);
      toast({
        title: "Submission Failed",
        description: "Could not file report. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>File an Incident Report</CardTitle>
            <CardDescription>
              Tell us about a deceptive practice, policy violation, or unfair charge. Your report is crucial to launching an investigation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <h3 className="text-lg font-semibold border-b pb-2">Incident Details</h3>
              
              <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="brandName">Brand Name Involved</Label>
                      <Input id="brandName" value={formData.brandName} onChange={handleChange} placeholder="e.g., FastShip Logistics" required />
                  </div>
                  
                  <div className="space-y-2">
                      <Label htmlFor="category">Issue Category</Label>
                      <Select value={formData.category} onValueChange={handleSelectChange}>
                          <SelectTrigger id="category">
                              <SelectValue placeholder="Select an issue category" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Subscription-Traps">Subscription Traps</SelectItem>
                              <SelectItem value="Deceptive-Pricing">Deceptive Pricing</SelectItem>
                              <SelectItem value="Warranty-Denial">Warranty/Claim Denial</SelectItem>
                              <SelectItem value="False-Advertising">False Advertising</SelectItem>
                              <SelectItem value="Refund-Issues">Refund Issues</SelectItem>
                              <SelectItem value="Poor-Service">Poor Service / Other</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="amount">Financial Loss (approx. £)</Label>
                      <Input id="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="e.g., 49.99" />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="issueDescription">Issue Description</Label>
                      <Textarea id="issueDescription" value={formData.issueDescription} onChange={handleChange} rows={5} placeholder="Describe the incident, including dates and relevant details." required />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="desiredOutcome">Your Desired Outcome</Label>
                      <Textarea id="desiredOutcome" value={formData.desiredOutcome} onChange={handleChange} rows={3} placeholder="e.g., Full refund of £49.99 and a public apology." required />
                  </div>
              </div>
              
              <h3 className="text-lg font-semibold border-b pb-2 pt-4">Your Contact Information (Private)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input id="name" value={formData.name} onChange={handleChange} placeholder="First and Last Name" required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(123) 456-7890" />
                  </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                  <Checkbox id="terms" required />
                  <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                      I confirm the above details are accurate to the best of my knowledge.
                  </label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Filing Report..." : "File Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}