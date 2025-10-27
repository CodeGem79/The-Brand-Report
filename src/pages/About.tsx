import { Header } from "@/components/Header";
import { Link } from "react-router-dom"; 
import { FileText, TrendingUp, Clock, BookOpen, ArrowRight } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export default function About() {
  const values = [
    { value: "Collective Power", description: "Your single voice is powerful, but hundreds of verified reports are undeniable. We provide the mechanism to unite those voices." },
    { value: "Verification & Trust", description: "We prioritize truth. Every report is triaged and validated by our administrative team to ensure the integrity of our investigations." },
    { value: "Transparency", description: "We operate in the open. You can see the status of every investigation and every official update made to the case." },
  ];

  const whatWeDo = [
    { icon: FileText, title: "Intelligence Gathering", description: "Every complaint filed contributes to a central database. We track patterns related to specific brands, products, and practices." },
    { icon: TrendingUp, title: "Launching Investigations", description: "When a volume of verified reports related to the same issue meets a set threshold, we launch a formal Investigation, moving the issue out of the customer service queue and into the public eye." },
    { icon: Clock, title: "Transparent Tracking", description: "Every investigation features a public Timeline and detailed status updates (e.g., Under Observation, Investigating, Resolved). Supporters can track our progress and see the evidence we collect in real-time." },
    { icon: BookOpen, title: "Consumer Education", description: "Through our Blog and resources, we equip consumers with the knowledge to understand their rights and identify deceptive practices before they become a problem." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12 max-w-5xl space-y-12">

        {/* Hero / Mission Statement */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground">
            Shifting the Power Back to the Consumer.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The Brand Report is a community-driven platform dedicated to holding corporations accountable for deceptive practices, broken promises, and unfair policies. We transform individual frustrations into collective, focused action.
          </p>
        </section>

        <Separator className="my-10" />

        {/* What We Do */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-foreground">
            How Our Investigations Work
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whatWeDo.map((item, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <item.icon className="w-8 h-8 text-accent mb-2" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Our Core Values */}
        <section className="space-y-8 pt-8">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Our Core Values
          </h2>
          <Card>
            <Table>
              <TableBody>
                {values.map((item, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-semibold text-lg text-primary w-[30%]">
                      {item.value}
                    </TableCell>
                    <TableCell className="text-base text-foreground">
                      {item.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
        
        {/* Call to Action */}
        <section className="text-center pt-10">
            <h3 className="text-2xl font-semibold mb-4">Ready to take action?</h3>
            <Button asChild size="lg" className="text-lg">
                <Link to="/file-complaint" className="flex items-center gap-2">
                    File Your Complaint Now
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </Button>
        </section>

      </main>
    </div>
  );
}