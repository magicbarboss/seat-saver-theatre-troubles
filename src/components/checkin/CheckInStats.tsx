import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, User, Clock, Layout, MapPin } from 'lucide-react';

interface CheckInStatsProps {
  totalGuests: number;
  checkedInCount: number;
  allocatedCount: number;
  totalPizzasNeeded: number;
  showTimeStats: { [key: string]: number };
  lastSaved: Date;
}

export const CheckInStats = ({
  totalGuests,
  checkedInCount,
  allocatedCount,
  totalPizzasNeeded,
  showTimeStats,
  lastSaved
}: CheckInStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGuests}</div>
        </CardContent>
      </Card>

      <Card className="card-stat card-stat-success">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Checked In</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{checkedInCount}</div>
          <p className="text-xs text-muted-foreground">
            {((checkedInCount / totalGuests) * 100).toFixed(0)}% complete
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tables Allocated</CardTitle>
          <Layout className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{allocatedCount}</div>
          <p className="text-xs text-muted-foreground">
            {checkedInCount > 0 ? ((allocatedCount / checkedInCount) * 100).toFixed(0) : 0}% of checked-in
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pizzas Needed</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{totalPizzasNeeded}</div>
          <p className="text-xs text-muted-foreground">For checked-in guests</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Show Times</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {Object.entries(showTimeStats).map(([time, count]) => (
            <div key={time} className="flex justify-between text-sm">
              <span>{time}:</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Saved</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            {lastSaved.toLocaleTimeString()}
          </div>
          <p className="text-xs text-muted-foreground">Auto-saves every 30s</p>
        </CardContent>
      </Card>
    </div>
  );
};