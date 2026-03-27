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

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary');
  });

  it('applies accent variant classes', () => {
    render(<Button variant="accent">Accent</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-accent');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
  });

  it('applies size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-xs');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    const svg = btn.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.className).toContain('motion-safe:animate-spin');
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('my-custom-class');
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
    expect(card!.className).not.toContain('p-6');
  });

  it('applies hover styles when hover is true', () => {
    render(<Card hover>Hover card</Card>);
    const card = screen.getByText('Hover card').closest('div');
    expect(card!.className).toContain('hover:border-primary/30');
  });

  it('does not apply hover styles by default', () => {
    render(<Card>No hover</Card>);
    const card = screen.getByText('No hover').closest('div');
    expect(card!.className).not.toContain('hover:border-primary/30');
  });

  it('applies base styles', () => {
    render(<Card>Base</Card>);
    const card = screen.getByText('Base').closest('div');
    expect(card!.className).toContain('bg-surface');
    expect(card!.className).toContain('border');
    expect(card!.className).toContain('rounded-xl');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('applies margin-bottom', () => {
    render(<CardHeader>Header</CardHeader>);
    const header = screen.getByText('Header').closest('div');
    expect(header!.className).toContain('mb-3');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-surface');
  });

  it('applies primary variant styles', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge.className).toContain('bg-primary/15');
  });

  it('applies accent variant styles', () => {
    render(<Badge variant="accent">Accent</Badge>);
    const badge = screen.getByText('Accent');
    expect(badge.className).toContain('bg-accent/15');
  });

  it('applies outline variant styles', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge.className).toContain('bg-transparent');
  });

  it('has rounded-full class', () => {
    render(<Badge>Rounded</Badge>);
    const badge = screen.getByText('Rounded');
    expect(badge.className).toContain('rounded-full');
  });
});

describe('Input', () => {
  it('renders without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('generates id from label', () => {
    render(<Input label="First Name" />);
    const input = screen.getByLabelText('First Name');
    expect(input.id).toBe('first-name');
  });

  it('uses provided id over generated one', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByLabelText('Email');
    expect(input.id).toBe('custom-id');
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('applies error border styling', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('border-red-400');
  });

  it('applies normal border when no error', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('border-border');
    expect(input.className).not.toContain('border-red-400');
  });
});

describe('SectionHeader', () => {
  it('renders title as h1', () => {
    render(<SectionHeader title="Page Title" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Page Title');
  });

  it('renders subtitle below title', () => {
    render(<SectionHeader title="Title" subtitle="A description" />);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<SectionHeader title="Title" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('renders label as h3 when no title', () => {
    render(<SectionHeader label="SECTION" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('SECTION');
  });

  it('renders action link when provided', () => {
    render(<SectionHeader title="Title" action={{ text: 'View all', href: '/all' }} />);
    const link = screen.getByText('View all');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/all');
  });

  it('renders action with label mode', () => {
    render(<SectionHeader label="POSTS" action={{ text: 'See more', href: '/posts' }} />);
    const link = screen.getByText('See more');
    expect(link.getAttribute('href')).toBe('/posts');
  });
});
