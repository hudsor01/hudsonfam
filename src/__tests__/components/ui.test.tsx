import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-destructive');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-accent');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-8');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('my-custom-class');
  });

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding (md)', () => {
    render(<Card>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card!.className).toContain('p-5');
  });

  it('applies no padding when padding="none"', () => {
    render(<Card padding="none">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card!.className).not.toContain('p-5');
    expect(card!.className).not.toContain('p-4');
  });

  it('applies hover classes when hover is true', () => {
    render(<Card hover>Hoverable</Card>);
    const card = screen.getByText('Hoverable').closest('div');
    expect(card!.className).toContain('hover:border-primary/30');
  });

  it('does not apply hover classes by default', () => {
    render(<Card>No hover</Card>);
    const card = screen.getByText('No hover').closest('div');
    expect(card!.className).not.toContain('hover:border-primary/30');
  });

  it('applies bg-card class', () => {
    render(<Card>Styled</Card>);
    const card = screen.getByText('Styled').closest('div');
    expect(card!.className).toContain('bg-card');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Body</CardContent>);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toBeTruthy();
  });

  it('applies primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge.className).toContain('bg-primary');
  });

  it('applies accent variant', () => {
    render(<Badge variant="accent">Accent</Badge>);
    const badge = screen.getByText('Accent');
    expect(badge.className).toContain('bg-accent');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge.className).toContain('border');
  });

  it('merges custom className', () => {
    render(<Badge className="extra">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('extra');
  });
});

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toBeInTheDocument();
  });

  it('renders with label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<Input error="Bad" placeholder="test" />);
    const input = screen.getByPlaceholderText('test');
    expect(input.className).toContain('border-destructive');
  });

  it('does not add error class when no error', () => {
    render(<Input placeholder="test" />);
    const wrapper = screen.getByPlaceholderText('test').closest('div');
    // No error message element should exist
    expect(wrapper!.querySelector('p')).toBeNull();
  });

  it('forwards type prop', () => {
    render(<Input type="email" placeholder="email" />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toHaveAttribute('type', 'email');
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="My Section" />);
    expect(screen.getByText('My Section')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Title" subtitle="Subtitle" />);
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renders action link when provided', () => {
    render(<SectionHeader title="Test" action={{ text: 'View all', href: '/all' }} />);
    const link = screen.getByText('View all');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/all');
  });

  it('renders title with serif styling', () => {
    render(<SectionHeader title="Section" />);
    const title = screen.getByText('Section');
    expect(title.className).toContain('font-serif');
  });
});
