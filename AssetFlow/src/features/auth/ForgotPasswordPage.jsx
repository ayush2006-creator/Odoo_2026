import { useState } from 'react';
import { Link } from 'react-router';
import { Particles } from '@/components/ui/particles';
import { BlurFade } from '@/components/ui/blur-fade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTheme } from '@/components/layout/ThemeProvider';
import { forgotPassword } from '@/api/auth';

export default function ForgotPasswordPage() {
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSuccess('If that email is registered, a reset link has been sent. Check your inbox.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <Particles
        className="absolute inset-0 z-0"
        quantity={80}
        color={theme === 'dark' ? '#60a5fa' : '#3b82f6'}
        refresh={false}
      />

      <BlurFade delay={0.1} className="relative z-10 w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              AF
            </div>
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center gap-1 text-sm">
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              ← Back to Login
            </Link>
          </CardFooter>
        </Card>
      </BlurFade>
    </div>
  );
}
