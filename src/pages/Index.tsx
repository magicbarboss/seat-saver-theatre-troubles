
import CsvUpload from "@/components/CsvUpload";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="header-gradient text-center mb-8 rounded-lg animate-fade-in">
          <h1 className="text-4xl font-bold mb-4">Theatre Seating System</h1>
          <p className="text-xl">Upload your CSV file to get started</p>
        </div>
        <CsvUpload />
      </div>
    </div>
  );
};

export default Index;
