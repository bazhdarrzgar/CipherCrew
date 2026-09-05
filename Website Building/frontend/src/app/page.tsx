import Hero from '@/components/ui/Hero';
import InfoSections from '@/components/InfoSections';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-12">
      <Hero />
      <InfoSections />
    </main>
  );
}
