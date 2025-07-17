
import CsvUpload from "@/components/CsvUpload";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-center mb-8 rounded-lg py-12 px-6 shadow-lg">
          <h1 className="text-5xl font-bold mb-4">Theatre Seating Management</h1>
          <p className="text-xl mb-6">Complete guest experience from check-in to seating</p>
          <div className="flex justify-center gap-8 text-sm">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold">📋</div>
              <div>Guest Lists</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold">✅</div>
              <div>Check-In</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold">🪑</div>
              <div>Table Design</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold">👥</div>
              <div>Seating Assignment</div>
            </div>
          </div>
        </div>
        <CsvUpload />
      </div>
    </div>
  );
};

export default Index;
