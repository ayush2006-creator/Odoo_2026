import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
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
import { login } from '@/api/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please try again.');
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
            <CardTitle className="text-xl">AssetFlow — Login</CardTitle>
            <CardDescription>
              Sign in to manage your organisation's assets
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" variant="default" size="lg" className="mt-1 w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-2 text-center">
            <p className="text-xs text-muted-foreground">
              New here? Sign up creates an employee account — admin roles are assigned later.
            </p>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/signup">Create Account</Link>
            </Button>
          </CardFooter>
        </Card>
      </BlurFade>
    </div>
  );
}
