import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const AuthLayout = ({ children }: any) => {
  return (
    <div className="min-h-screen flex flex-col bg-background  dark:bg-slate-950">
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};