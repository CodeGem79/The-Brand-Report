import { TrendingUp, MessageSquare, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Petition } from "@/data/mockData";

interface PetitionCardProps {
  petition: Petition;
}

export const PetitionCard = ({ petition }: PetitionCardProps) => {
  const statusColors = {
    active: "bg-accent text-accent-foreground",
    investigating: "bg-secondary text-secondary-foreground",
    resolved: "bg-muted text-muted-foreground"
  };

  const statusLabels = {
    active: "Under Observation",
    investigating: "Investigating",
    resolved: "Resolved"
  };

  return (
    <Link to={`/petition/${petition.id}`}>
      <Card className="h-full transition-all hover:shadow-lg hover:border-accent/50 cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge className={statusColors[petition.status]}>
              {statusLabels[petition.status]}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(petition.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <CardTitle className="text-xl">{petition.brand}</CardTitle>
          <CardDescription className="font-semibold text-foreground">
            {petition.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {petition.description}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 font-semibold text-accent">
              <TrendingUp className="w-4 h-4" />
              <span>{petition.supporters.toLocaleString()} supporters</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{petition.comments.length} comments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
