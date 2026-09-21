#!/usr/bin/env ruby
# Parse the YAML frontmatter of every skill, agent, and command with a real
# YAML parser. `claude plugin validate` does this too, but how strictly depends
# on the CLI build: a frontmatter block that one release accepts, another
# rejects, and a rejected block loads at runtime with every field silently
# dropped. This check is the same on every machine.
#
# Usage: scripts/check-frontmatter.rb [root]   (exit 1 on any problem)

require "yaml"

root = File.expand_path(ARGV[0] || File.join(__dir__, ".."))
required = Dir.glob(["**/skills/*/SKILL.md", "**/agents/*.md"], base: root)
optional = Dir.glob("**/commands/*.md", base: root)

problems = []

def frontmatter(lines)
  return nil unless lines.first&.strip == "---"
  close = lines[1..].index { |l| l.strip == "---" }
  return nil if close.nil?
  lines[1, close].join
end

(required + optional).sort.uniq.each do |rel|
  next if rel.start_with?("node_modules/")
  lines = File.readlines(File.join(root, rel))
  block = frontmatter(lines)

  if block.nil?
    problems << [rel, "no frontmatter block"] if required.include?(rel)
    next
  end

  begin
    data = YAML.safe_load(block)
  rescue Psych::SyntaxError => e
    problems << [rel, "YAML does not parse: #{e.message.sub(/^\(<unknown>\): /, '')}"]
    next
  end

  problems << [rel, "frontmatter is not a mapping"] unless data.is_a?(Hash)
end

problems.each { |rel, why| puts "FAIL: #{rel}\n  #{why}" }
checked = (required + optional).uniq.size
if problems.empty?
  puts "ok:   frontmatter parses in #{checked} files"
else
  puts "\n#{problems.size} frontmatter problem(s) in #{checked} files."
  exit 1
end
