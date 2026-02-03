'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { KinetixLogo } from '@/components/k-logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const IdleScreen = ({ onStart }: { onStart: () => void }) => {
    const bgImage = PlaceHolderImages.find(img => img.id === 'webcam-background');

    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {bgImage && (
                 <Image
                    src={bgImage.imageUrl}
                    alt={bgImage.description}
                    fill
                    className="object-cover scale-105"
                    data-ai-hint={bgImage.imageHint}
                />
            )}
            <div className="absolute inset-0 bg-slate-950/50" />

            <div className="relative flex flex-col items-center justify-center bg-card/60 backdrop-blur-md border border-primary/30 rounded-2xl shadow-cyan-glow p-8 md:p-12 max-w-lg text-center">
                <KinetixLogo className="h-8 w-8 text-primary mb-4" />
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100 mb-4">Ready for your session?</h1>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Ensure your full body is visible in the frame and the lighting is clear.
                </p>
                <Button
                    onClick={onStart}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-cyan-glow transition-all duration-300"
                >
                    <Play className="mr-3" />
                    START SESSION
                </Button>
            </div>
        </div>
    );
}
