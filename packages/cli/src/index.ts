// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

import { Command } from 'commander'
import { auditCommand } from './commands/audit'

const program = new Command()

program
  .name('fsaudit')
  .description(
    'FlowState Security Audit — bundle a codebase and stream a security / gap / architecture review from a configurable LLM provider.'
  )
  .version('0.1.0')

program.addCommand(auditCommand)

program.parse()
