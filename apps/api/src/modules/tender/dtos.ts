export class CreateTenderDto {
  title?: string;
  source?: 'GEM' | 'CPPP' | 'UTILITY_PORTAL' | 'INTERNAL_REFERRAL' | 'OTHER';
  clientName?: string;
  clientContact?: string;
  issuingAuthority?: string;
  estimatedValue?: number;
  emdAmount?: number;
  currency?: string;
  tenderFee?: number;
  publishDate?: Date;
  submissionDueDate?: Date;
  openingDate?: Date;
  preBidMeetingDate?: Date;
  location?: string;
  description?: string;
  eligibilityNotes?: string;
  tags?: string[];
  priority?: string;
  assignedToId?: string;
  leadId?: string;
}

export class UpdateTenderDto {
  title?: string;
  status?: string;
  stage?: string;
  priority?: string;
  assignedToId?: string;
  leadId?: string;
  clientName?: string;
  clientContact?: string;
  issuingAuthority?: string;
  estimatedValue?: number;
  emdAmount?: number;
  currency?: string;
  tenderFee?: number;
  publishDate?: Date;
  submissionDueDate?: Date;
  openingDate?: Date;
  preBidMeetingDate?: Date;
  location?: string;
  description?: string;
  eligibilityNotes?: string;
  tags?: string[];
  outcomeReason?: string;
  outcomeNotes?: string;
  goDecision?: 'GO' | 'NO_GO';
  goDecisionNotes?: string;
}

export class TenderSearchDto {
  status?: 'DRAFT' | 'IN_REVIEW' | 'QUALIFICATION' | 'GO_DECISION' | 'COSTING' | 'SUBMISSION_READY' | 'SUBMITTED' | 'OPENED' | 'EVALUATED' | 'WON' | 'LOST' | 'WITHDRAWN' | 'CANCELLED';
  stage?: string;
  goDecision?: 'GO' | 'NO_GO' | undefined;
  clientName?: string;
  source?: string;
  projectId?: string;
  assignedTo?: string;
  priority?: string;
  page?: number;
  limit?: number;
}