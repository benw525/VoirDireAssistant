export interface StrategyModule {
  category: string;
  archetypes: string;
  biasPatterns: string;
  questionSequencing: string;
  causeChallengeGrounds: string;
  inoculation: string;
  plaintiffRules: string;
  defenseRules: string;
}

export interface SubSpecOverlay {
  name: string;
  archetypes: string;
  screeningPoints: string;
  inoculation: string;
}

// ─── MODULE 01: CRIMINAL LAW ───────────────────────────────────────────────

const CRIMINAL_LAW_BASE: StrategyModule = {
  category: 'Criminal Law',
  archetypes: `CRIMINAL LAW STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Authoritarian: Defers to authority, trusts police implicitly, believes arrest equals guilt. Likely to credit law enforcement testimony without scrutiny and resent the defendant for "making us all sit here."
2. The Victim Identifier: Has personal or family experience with violent crime. May unconsciously side with the complainant regardless of evidence quality. Emotional response may override analytical thinking.
3. The Verdict Telegrapher: Has already formed an opinion about guilt based on the charge alone. Often reveals this through statements like "where there's smoke there's fire" or discomfort with the presumption of innocence.
4. The System Skeptic: Deep distrust of police, prosecutors, or the criminal justice system generally. May nullify or refuse to convict regardless of evidence. Can also be hostile toward defense attorneys they see as "getting people off."
5. The Reluctant Juror: Resentful about service, distracted by personal obligations, openly disengaged. Unlikely to deliberate carefully or follow complex instructions.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Presumption of innocence compliance: Can the juror truly start at zero, or do they believe the defendant "must have done something"?
- Burden of proof understanding: Does the juror understand that "beyond a reasonable doubt" means the State must prove every element, not that the defendant must prove innocence?
- Right to silence: Can the juror accept that the defendant may not testify and not hold it against them?
- Law enforcement credibility: Does the juror automatically believe police testimony over civilian testimony?
- Prior criminal justice exposure: Has the juror or a close family member been arrested, charged, convicted, or victimized? How did that experience shape their views?
- Punishment orientation: Is the juror more focused on conviction and sentencing than on evaluating evidence?
- Witness credibility assessment: Can the juror evaluate conflicting testimony on its merits rather than defaulting to the "official" version?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Background and experience (least threatening): Prior jury service, familiarity with criminal cases, personal experiences with crime or law enforcement
2. Attitude exploration: Views on the justice system, fairness of the process, whether innocent people get charged
3. Burden and rights: Understanding of presumption of innocence, burden of proof, right to remain silent — explore misunderstandings without lecturing
4. Witness credibility: Comfort evaluating conflicting stories, experience making credibility judgments, views on police testimony
5. Specific case themes: Inoculate on the specific facts (type of crime, relationship between parties, nature of evidence)
6. Fairness commitment: Final questions about ability to be fair, follow the law, and hold the State to its burden`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they would expect the defendant to testify or present evidence
- Juror states they would give more weight to police testimony simply because the witness is an officer
- Juror has a close relationship with law enforcement, the DA's office, or a party/witness
- Juror has been a victim of a similar crime and states or implies they cannot set that aside
- Juror expresses a fixed opinion about guilt based on the charge
- Juror states they cannot follow the beyond-a-reasonable-doubt standard
- Juror has pending charges or is a witness in a case handled by the same DA's office`,

  inoculation: `KEY INOCULATION TOPICS:
- The defendant is not required to prove anything or present any evidence
- An accusation is not evidence; the indictment/information is just a formal charge
- Witness testimony can be unreliable even when the witness believes they are telling the truth
- The State's burden never shifts to the defense at any point
- Jurors may find a witness not credible even if no one directly contradicts them
- A not-guilty verdict is not the same as saying the defendant is innocent — it means the State did not meet its burden`,

  plaintiffRules: `IF REPRESENTING PROSECUTION/STATE:
- Screen for jurors with deep distrust of law enforcement or the criminal justice system
- Identify jurors who may nullify (refuse to convict regardless of evidence)
- Screen for jurors with personal criminal history who may over-identify with the defendant
- Look for jurors who express extreme skepticism about witness testimony generally
- Watch for jurors who state they could "never" convict based on circumstantial evidence
- Favorable signals: respect for law enforcement (without blind deference), prior jury service resulting in conviction, comfort with the responsibility of rendering a guilty verdict, stated belief that the system generally works`,

  defenseRules: `IF REPRESENTING DEFENSE:
- Screen aggressively for jurors who equate accusation with guilt
- Develop cause challenges on right-to-silence violations (jurors who expect testimony from the accused)
- Screen for law enforcement connections that create automatic credibility bias
- Identify jurors with victim experiences similar to the alleged crime
- Look for jurors who understand and value the concept of holding the government to its burden
- Favorable signals: prior jury service resulting in acquittal, experience questioning authority, professional experience evaluating evidence or making credibility judgments, stated belief that the system sometimes gets it wrong`
};

const CRIMINAL_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Capital/Homicide',
    archetypes: `CAPITAL / HOMICIDE OVERLAY:

ADDITIONAL ARCHETYPES:
- The Death Penalty Absolutist: Believes anyone convicted of murder must receive the death penalty. Cannot genuinely consider the full range of punishment. Often reveals through statements like "an eye for an eye" or "some crimes only have one answer."
- The Life-Means-Life Doubter: Believes life without parole does not actually mean life. Fears the defendant will "get out someday." May push for death as the only "safe" option.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Can the juror consider the full range of punishment, including life without parole?
- Does the juror have religious or moral convictions that would prevent them from voting for either death or life?
- Can the juror follow mitigation instructions and consider the defendant's background, mental health, and circumstances?
- Has the juror or a family member been a homicide victim? How did the case resolve?
- Does the juror understand that a life-without-parole sentence means the defendant will die in prison?`,
    inoculation: `INOCULATION:
- The jury must consider mitigating circumstances even if they find the defendant guilty
- Life without parole means exactly what it says — no possibility of release
- The decision on punishment is separate from the decision on guilt`
  },
  {
    name: 'DUI/DWI',
    archetypes: `DUI / DWI OVERLAY:

ADDITIONAL ARCHETYPES:
- The MADD Advocate: Personal connection to drunk driving tragedy. Views any DUI defendant as a potential killer. Cannot separate this defendant from their experience.
- The Social Drinker in Denial: Drinks regularly, drives after drinking, but would never admit it. May be harsh on the defendant to distance themselves from their own behavior.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Has the juror or anyone close to them been injured or killed by an impaired driver?
- Does the juror believe that any amount of alcohol makes a person too impaired to drive?
- Does the juror understand that field sobriety tests and breathalyzers can produce inaccurate results?
- Does the juror have strong feelings about alcohol or drug use generally?
- Can the juror distinguish between "had been drinking" and "impaired beyond the legal limit"?`,
    inoculation: `INOCULATION:
- Breath and blood testing equipment can malfunction or be improperly calibrated
- Field sobriety tests are subjective evaluations, not scientific measurements
- The legal standard is impairment beyond the legal limit, not any consumption at all`
  },
  {
    name: 'Drug Offenses',
    archetypes: `DRUG OFFENSES OVERLAY:

ADDITIONAL ARCHETYPES:
- The Zero-Tolerance Parent: Has children and views any drug activity as an existential threat to families. Cannot see drug possession as anything other than morally reprehensible.
- The Addiction-Is-Choice Juror: Believes addiction is a character flaw, not a medical condition. Will not be sympathetic to any mitigation involving substance abuse.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe all drug offenses should result in prison time regardless of circumstances?
- Has the juror or a family member struggled with addiction? How did that shape their views?
- Does the juror distinguish between drug possession for personal use and distribution?
- Can the juror evaluate whether the State proved the defendant actually knew about or controlled the substance?
- Does the juror have views on drug policy that would prevent fair evaluation of the evidence?`,
    inoculation: `INOCULATION:
- Proximity to drugs does not equal possession or knowledge
- Constructive possession requires proof of knowledge and control, not just presence
- The quantity of a substance does not automatically prove intent to distribute`
  },
  {
    name: 'Sex Offenses',
    archetypes: `SEX OFFENSES OVERLAY:

ADDITIONAL ARCHETYPES:
- The Protective Parent: Views any accusation involving sexual conduct as automatically credible. Cannot separate the emotional weight of the charge from the evidence requirement.
- The Stigma Voter: Believes that merely being charged with a sex offense proves something is wrong with the defendant. The social stigma becomes evidence in their mind.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Can the juror evaluate the accuser's testimony with the same scrutiny as any other witness?
- Has the juror or someone close to them been a victim of sexual assault? Can they set that aside?
- Does the juror believe that false accusations of sexual crimes are extremely rare or essentially nonexistent?
- Can the juror follow the instruction that the accuser's testimony must be evaluated like any other witness's?
- Can the juror look at the defendant without prejudging based on the nature of the charge?`,
    inoculation: `INOCULATION:
- The nature of the charge does not change the burden of proof
- A single witness's testimony must still be evaluated for credibility and consistency
- The presumption of innocence applies with the same force regardless of what the charge is
- The jury must decide based on evidence, not emotion or the seriousness of the allegation`
  },
  {
    name: 'White Collar/Federal',
    archetypes: `WHITE COLLAR / FEDERAL OVERLAY:

ADDITIONAL ARCHETYPES:
- The Anti-Corporate Populist: Views anyone in business or finance as inherently corrupt. Predisposed to believe financial misconduct charges because "they're all crooks."
- The Complexity Avoider: Overwhelmed by financial documents, accounting concepts, or regulatory frameworks. May default to "they wouldn't have been charged if they didn't do something" rather than engage with complicated evidence.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror have strong feelings about corporations, banks, or Wall Street?
- Can the juror follow complex financial evidence and accounting concepts?
- Does the juror understand the difference between aggressive business practices and criminal conduct?
- Is the juror comfortable with the idea that a successful businessperson can be innocent of fraud?
- Can the juror distinguish between civil liability and criminal guilt?`,
    inoculation: `INOCULATION:
- Business judgments that turn out badly are not crimes
- The complexity of financial transactions does not make them suspicious
- Intent is a required element — the government must prove the defendant acted with criminal purpose, not just that a loss occurred`
  },
  {
    name: 'Domestic Violence',
    archetypes: `DOMESTIC VIOLENCE OVERLAY:

ADDITIONAL ARCHETYPES:
- The Survivor Advocate: Has personal experience with domestic violence (as victim, witness, or through a close relationship). Views all DV accusations through the lens of their own experience.
- The Reconciliation Skeptic: Believes that if the victim returned to or maintains contact with the defendant, the accusation must be false or exaggerated. Misunderstands the dynamics of abusive relationships.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Has the juror or someone close experienced domestic violence? How did it resolve?
- Does the juror understand that victims sometimes recant or minimize for reasons unrelated to truth?
- Can the juror evaluate the evidence without automatically believing or disbelieving the complainant based on the relationship context?
- Does the juror have views about how domestic disputes should be handled (e.g., "keep it in the family" vs. "always prosecute")?
- Can the juror follow the instruction that prior bad acts (if excluded) cannot be considered?`,
    inoculation: `INOCULATION:
- The relationship between the parties does not change the evidence standard
- Witness credibility must be evaluated on the specifics of this case, not assumptions about domestic relationships generally
- The defendant's character is not on trial unless specific evidence is admitted`
  }
];

// ─── MODULE 02: PERSONAL INJURY / TORT ──────────────────────────────────────

const PI_TORT_BASE: StrategyModule = {
  category: 'Personal Injury / Tort',
  archetypes: `PERSONAL INJURY / TORT STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Tort Reformer: Believes lawsuits are out of control, verdicts are too large, and plaintiffs are usually exaggerating. Often works in business, insurance, or management. May use phrases like "lawsuit lottery" or "personal responsibility."
2. The Sympathy Voter: Cannot separate emotional response to injury from analytical evaluation of liability and causation. Will award damages based on how badly the plaintiff is hurt regardless of whether the defendant caused it.
3. The Corporate Apologist: Identifies with businesses and employers. Believes companies generally act responsibly and that plaintiffs are motivated by greed. May work in management or own a business.
4. The Anti-Authority Plaintiff: Distrusts all institutions (corporations, hospitals, insurance companies) and assumes the plaintiff is David fighting Goliath. May award damages to "send a message" regardless of evidence.
5. The Minimizer: Believes everyone exaggerates their injuries, that pain is subjective, and that people should just "tough it out." Often dismissive of soft-tissue injuries, mental health claims, or chronic pain.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Litigation attitudes: Does the juror believe there are too many lawsuits? That verdicts are too high? That people should handle problems without suing?
- Damages comfort: Can the juror award large damages if the evidence supports it? Or will they anchor low regardless?
- Corporate vs. individual framing: Does the juror automatically side with businesses or individuals?
- Personal responsibility attribution: Does the juror believe injured people usually bear some fault?
- Insurance awareness: Does the juror understand (or assume) that insurance is involved? Will that affect their verdict?
- Medical skepticism: Does the juror distrust doctors, medical testimony, or the ability to objectively measure pain and suffering?
- Prior claims experience: Has the juror made an injury claim, been denied a claim, or been sued? How did that shape their views?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Experience with lawsuits and the legal system: Prior jury service in civil cases, personal claims, involvement in litigation
2. Attitudes toward lawsuits and damages: General views on the civil justice system, lawsuit frequency, verdict sizes
3. Corporate and institutional attitudes: Views on businesses, hospitals, insurance companies depending on the defendant type
4. Damages exploration: Comfort with non-economic damages (pain and suffering, loss of enjoyment), understanding of future damages, willingness to award what the evidence supports
5. Specific liability themes: Negligence concepts, comparative fault, causation, standard of care
6. Money comfort: Ability to write a large number on a verdict form if the evidence justifies it`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe most lawsuits are frivolous or that people sue too much
- Juror states they could not award non-economic damages (pain and suffering) because they are too subjective
- Juror states a specific dollar cap they would never exceed regardless of evidence
- Juror has a financial interest in the outcome (e.g., employed by the defendant, insured by the same carrier)
- Juror states they believe the plaintiff should bear responsibility for their injury regardless of the facts
- Juror has a close relationship with a party, witness, or treating physician
- Juror states they would hold the plaintiff to a higher standard because they are the one suing`,

  inoculation: `KEY INOCULATION TOPICS:
- Non-economic damages (pain, suffering, loss of enjoyment) are real and recognized by law
- The jury's job is to make the plaintiff whole, not to compromise
- Comparative fault means apportioning responsibility, not eliminating the claim
- Future damages require projection based on evidence, not guesswork
- The amount of the verdict should be based on the evidence, not on what feels "reasonable" in a vacuum
- Insurance (if relevant and admissible) exists to pay claims — that is its purpose`,

  plaintiffRules: `IF REPRESENTING PLAINTIFF:
- Screen aggressively for tort reform attitudes and lawsuit skepticism
- Identify jurors who would cap damages regardless of evidence
- Screen for corporate favoritism, especially if the defendant is a business entity
- Develop cause challenges on damages refusal (jurors who state they cannot award non-economic damages)
- Look for jurors comfortable with the responsibility of awarding full compensation
- Favorable signals: prior experience being wronged by an institution, empathy without sentimentality, professional experience caring for others, stated belief that accountability matters`,

  defenseRules: `IF REPRESENTING DEFENSE:
- Screen for anti-corporate bias and automatic sympathy for injured plaintiffs
- Identify jurors who would award damages based on sympathy rather than causation
- Screen for jurors who distrust the defendant's industry (medicine, construction, manufacturing, etc.)
- Develop cause challenges on jurors who state they would presume liability from the existence of an injury
- Look for jurors who understand comparative fault and personal responsibility
- Favorable signals: business experience, management roles, analytical professions, comfort with the concept that bad outcomes don't always mean someone was negligent`
};

const PI_TORT_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Medical Malpractice',
    archetypes: `MEDICAL MALPRACTICE OVERLAY:

ADDITIONAL ARCHETYPES:
- The Doctor Worshipper: Views physicians as infallible. Cannot believe a doctor would make a serious mistake. May have a personal physician they adore and project that relationship onto the defendant.
- The System Blamer: Believes the healthcare system is fundamentally broken and that medical errors are routine. Predisposed to find liability in any bad outcome.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror or a family member work in healthcare? What is their role and how do they view medical errors?
- Does the juror believe doctors generally do their best, or that the system creates avoidable mistakes?
- Can the juror distinguish between a bad medical outcome and medical negligence?
- Does the juror have strong feelings about healthcare costs, insurance, or access to care?
- Has the juror or a family member experienced a medical error or unexpected complication?`,
    inoculation: `INOCULATION:
- A bad outcome does not automatically mean malpractice occurred
- The standard of care is what a reasonably prudent physician would do, not perfection
- Medical expert testimony may conflict — the jury must evaluate which experts are more credible
- Informed consent means the patient accepted known risks; the question is whether the physician deviated from the standard`
  },
  {
    name: 'Products Liability',
    archetypes: `PRODUCTS LIABILITY OVERLAY:

ADDITIONAL ARCHETYPES:
- The User-Error Default: Believes product injuries are almost always caused by misuse. If the plaintiff got hurt, they must have done something wrong.
- The Anti-Regulation Libertarian: Opposes product safety regulation and believes consumers should bear the risk of their choices. Unlikely to hold manufacturers accountable.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe manufacturers generally make safe products, or that corners are regularly cut?
- Does the juror understand the difference between a design defect, manufacturing defect, and failure to warn?
- Has the juror been injured by a product or had a product fail unexpectedly?
- Does the juror have engineering, manufacturing, or quality-control experience?
- Can the juror hold a large corporation responsible even if the product is widely used without incident by most consumers?`,
    inoculation: `INOCULATION:
- A product can be defective even if most users are not injured
- The manufacturer has a duty to anticipate reasonably foreseeable misuse
- Warnings must be adequate, not just present
- The focus is on whether the product was unreasonably dangerous, not whether the plaintiff was careful`
  },
  {
    name: 'Wrongful Death',
    archetypes: `WRONGFUL DEATH OVERLAY:

ADDITIONAL ARCHETYPES:
- The Grief Projector: So emotionally affected by the death that they cannot analytically evaluate causation or liability. Will award damages based on the tragedy itself.
- The Life Valuator: Uncomfortable placing a dollar value on human life. May award token damages despite strong liability because the concept of monetizing death feels wrong.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Has the juror lost a close family member unexpectedly? How recently? Can they separate that experience from this case?
- Is the juror comfortable with the concept of placing a monetary value on a human life as the law requires?
- Does the juror understand the difference between compensatory damages in a death case and a "price" on someone's life?
- Can the juror follow the damages framework (loss of companionship, support, guidance, etc.) without being overwhelmed by emotion?`,
    inoculation: `INOCULATION:
- The law requires monetary compensation because it is the only remedy available in a civil case
- Damages categories (loss of companionship, support, guidance, future earnings) are specifically defined
- The jury's task is not to assign a value to life but to compensate for specific, provable losses
- Emotional difficulty with the subject does not excuse the duty to evaluate evidence carefully`
  },
  {
    name: 'Trucking/Auto Accident',
    archetypes: `TRUCKING / AUTO ACCIDENTS OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror drive for a living or have family members who do? May sympathize with a commercial driver defendant.
- Does the juror have strong opinions about truck drivers, road safety, or traffic enforcement?
- Has the juror been in a significant auto accident? Were they at fault? How did insurance handle it?
- Does the juror understand that trucking companies have regulatory obligations (hours of service, maintenance, training) beyond ordinary driver care?
- Can the juror hold a trucking company responsible for the actions of its driver?`,
    inoculation: `INOCULATION:
- Federal and state regulations impose specific duties on commercial carriers beyond ordinary traffic law
- Respondeat superior means the employer can be liable for the driver's on-duty conduct
- Hours-of-service violations, maintenance failures, and hiring practices are all relevant to the company's liability
- The severity of injuries from truck collisions reflects the physics involved, not exaggeration`
  },
  {
    name: 'Nursing Home/Elder Abuse',
    archetypes: `NURSING HOME / ELDER ABUSE OVERLAY:

ADDITIONAL ARCHETYPES:
- The Guilt Deflector: Has a family member in a nursing home or recently placed one. May minimize institutional failures to avoid confronting their own guilt about the placement decision.
- The Industry Insider: Works in healthcare, elder care, or facility management. May view staffing shortages and care lapses as unavoidable realities rather than negligence.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror have a family member in a nursing home or assisted living facility?
- Does the juror work in healthcare or elder care? What is their view of staffing and care standards?
- Does the juror believe nursing homes generally provide good care, or that problems are widespread?
- Can the juror evaluate a corporate nursing home chain's staffing decisions as potential negligence?
- Does the juror have strong feelings about end-of-life care, aging, or the value of elderly patients' lives?`,
    inoculation: `INOCULATION:
- Nursing homes have specific legal duties to provide adequate staffing and supervision
- Understaffing is often a corporate budgeting decision, not an unavoidable condition
- Falls, pressure ulcers, malnutrition, and medication errors can indicate systemic neglect
- The age and frailty of the resident does not reduce the facility's duty of care`
  },
  {
    name: 'Toxic Tort/Environmental',
    archetypes: `TOXIC TORT / ENVIRONMENTAL OVERLAY:

ADDITIONAL ARCHETYPES:
- The Causation Skeptic: Believes that linking chemical exposure to disease is speculative science. Demands certainty that no court or expert can provide.
- The Jobs-vs-Environment Voter: Identifies with the employer or industry and views the lawsuit as a threat to jobs and economic stability.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror work in the chemical, petroleum, manufacturing, or mining industry?
- Does the juror have strong views about environmental regulation (too much vs. too little)?
- Does the juror understand epidemiological and toxicological evidence, or will complexity create doubt by default?
- Does the juror live near the site or facility involved, and if so, do they have financial or social ties to the defendant?
- Can the juror accept that causation in toxic exposure cases is proven through scientific methodology, not certainty?`,
    inoculation: `INOCULATION:
- Scientific causation is proven by a preponderance of evidence, not absolute certainty
- Latency periods between exposure and disease are expected and do not undermine causation
- The defendant's knowledge of the hazard at the time of exposure is relevant to liability
- Multiple exposures do not excuse any single defendant's contribution`
  }
];

// ─── MODULE 03: EMPLOYMENT LAW ─────────────────────────────────────────────

const EMPLOYMENT_BASE: StrategyModule = {
  category: 'Employment Law',
  archetypes: `EMPLOYMENT LAW STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Loyal Manager: Has hiring/firing authority and identifies with the employer. Views termination as a business necessity and discrimination claims as excuses for poor performance.
2. The Disgruntled Employee: Harbors resentment toward their own employer or a former employer. May project their grievances onto the case and side with the plaintiff regardless of evidence.
3. The Meritocracy Believer: Believes the workplace is fundamentally fair and that hard work is always rewarded. Cannot accept that systemic discrimination exists in professional settings.
4. The Lawsuit Profiteer: Believes employment lawsuits are a way to get paid for getting fired. Views the plaintiff as gaming the system.
5. The Silent Sufferer: Has experienced workplace mistreatment themselves but never reported or sued. May resent the plaintiff for taking action they never did, or may deeply empathize.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Employment authority: Does the juror have hiring, firing, or disciplinary authority? Do they identify with management or workers?
- Discrimination beliefs: Does the juror believe workplace discrimination is common, rare, or essentially nonexistent?
- At-will employment understanding: Does the juror believe employers can fire anyone for any reason, full stop?
- Lawsuit attitudes: Does the juror believe most employment lawsuits are legitimate or opportunistic?
- Personal workplace experience: Has the juror been fired, demoted, passed over, or discriminated against? How did they handle it?
- Damages attitudes: Can the juror award emotional distress damages? Punitive damages against an employer?
- Industry connection: Does the juror work in the same industry as the defendant employer?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Work background: Current and past employment, management experience, work environment satisfaction
2. Workplace conflict experience: Has the juror witnessed or experienced unfair treatment at work?
3. Views on employment relationships: At-will doctrine, employer obligations, employee rights
4. Discrimination attitudes: Beliefs about the prevalence and seriousness of workplace discrimination
5. Damages comfort: Ability to award emotional distress, lost wages, and punitive damages in an employment context
6. Accountability: Can the juror hold an employer accountable for a supervisor's or manager's conduct?`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe most discrimination claims are fabricated or exaggerated
- Juror states employers should be free to fire anyone without consequences
- Juror has a business relationship with the defendant employer
- Juror states they could not award emotional distress damages because hurt feelings are not compensable
- Juror states they would require direct evidence of discriminatory intent ("smoking gun") and would not consider circumstantial evidence
- Juror has had a personal employment dispute with the same employer or in the same industry`,

  inoculation: `KEY INOCULATION TOPICS:
- Employment discrimination is usually proven through circumstantial evidence, not a recorded confession
- At-will employment does not mean an employer can fire someone for an illegal reason
- Emotional distress from workplace discrimination is real and compensable under law
- A legitimate business reason for termination does not end the inquiry if the reason was pretextual
- The jury does not need to find the employer is a bad company — only that this specific action was unlawful`,

  plaintiffRules: `IF REPRESENTING EMPLOYEE/PLAINTIFF:
- Screen for management identifiers who will side with the employer
- Screen for jurors who believe discrimination is essentially over or does not happen in modern workplaces
- Develop cause challenges on jurors who refuse to consider circumstantial evidence of intent
- Look for jurors who understand power dynamics in the workplace
- Favorable signals: has been treated unfairly at work, has seen others treated unfairly, non-management roles, empathy for vulnerable positions`,

  defenseRules: `IF REPRESENTING EMPLOYER/DEFENSE:
- Screen for jurors with personal grievances against employers generally
- Identify jurors who believe all employers are inherently exploitative
- Screen for jurors who would use punitive damages to "send a message" regardless of the evidence
- Look for jurors who understand business decision-making and operational pressures
- Favorable signals: management experience, business ownership, human resources background, comfort with the concept that termination can be legitimate even if the employee disagrees`
};

const EMPLOYMENT_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Discrimination',
    archetypes: `DISCRIMINATION OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe discrimination based on [the specific protected class in this case] is a significant problem or largely a thing of the past?
- Has the juror witnessed discrimination in their own workplace? How did they respond?
- Does the juror understand the concept of disparate treatment vs. disparate impact?
- Can the juror evaluate whether a stated business reason is pretextual without requiring a "smoking gun"?
- Does the juror have strong views about affirmative action, DEI programs, or diversity initiatives that could color their evaluation of either party?`,
    inoculation: `INOCULATION:
- Discrimination can be proven through patterns and circumstantial evidence
- An employer's stated reason for an action is not conclusive — the jury must evaluate whether it is genuine or pretextual
- Implicit bias can influence decisions even when the decision-maker does not consciously intend to discriminate`
  },
  {
    name: 'Sexual Harassment',
    archetypes: `SEXUAL HARASSMENT OVERLAY:

ADDITIONAL ARCHETYPES:
- The Threshold Setter: Has a very high bar for what constitutes harassment. Believes the plaintiff is being oversensitive and that workplace banter is harmless.
- The Blame Shifter: Believes the plaintiff invited or could have prevented the harassment by reporting sooner, dressing differently, or leaving the job.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe most sexual harassment claims are legitimate or exaggerated?
- Does the juror distinguish between "locker room talk" and legally actionable harassment?
- Does the juror believe the victim has a responsibility to immediately report and leave the workplace?
- Has the juror experienced or witnessed sexual harassment? How was it handled?
- Can the juror accept that a hostile work environment can exist even without physical touching?`,
    inoculation: `INOCULATION:
- The legal standard is whether the conduct was severe or pervasive enough to alter the conditions of employment
- Failure to immediately report does not invalidate a harassment claim
- Employers have a duty to prevent and correct harassment — the plaintiff should not have to quit to escape it
- The reasonable person standard, not the plaintiff's subjective sensitivity, controls`
  },
  {
    name: 'Whistleblower/Retaliation',
    archetypes: `WHISTLEBLOWER / RETALIATION OVERLAY:

ADDITIONAL ARCHETYPES:
- The Team Player: Values loyalty to the organization above all. Views whistleblowers as traitors or troublemakers who should have handled concerns internally.
- The Conspiracy Theorist: Assumes the employer is always covering something up. Will believe retaliation occurred based on the accusation alone.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe employees who report wrongdoing to outside authorities are acting responsibly or being disloyal?
- Has the juror ever witnessed wrongdoing at work? Did they report it? What happened?
- Does the juror understand that retaliation can include subtle actions (schedule changes, isolation, bad evaluations) not just termination?
- Can the juror evaluate the timing between the protected activity and the adverse action without assuming causation?`,
    inoculation: `INOCULATION:
- Employees are legally protected when they report reasonably believed violations in good faith
- Temporal proximity (reporting followed quickly by adverse action) is relevant but not conclusive
- Retaliation can be subtle and cumulative, not just a single dramatic firing
- The employer must show the same action would have been taken regardless of the report`
  }
];

// ─── MODULE 04: BUSINESS / COMMERCIAL ───────────────────────────────────────

const BUSINESS_COMMERCIAL_BASE: StrategyModule = {
  category: 'Business / Commercial',
  archetypes: `BUSINESS / COMMERCIAL LITIGATION STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Anti-Business Juror: Views all business disputes as rich people fighting over money they do not deserve. Disengaged from the start and may award or deny based on who seems wealthier or more sympathetic.
2. The Handshake Believer: Thinks contracts should be simple and that any dispute means someone is acting in bad faith. Cannot parse complex contractual language or industry-specific terms.
3. The Numbers Phobic: Shuts down when presented with financial evidence, spreadsheets, or damages calculations. May default to a compromise verdict rather than engaging with the math.
4. The Sophisticated Business Person: Has enough business experience to substitute their own judgment for the evidence. May decide what "should have" happened rather than what the contract required.
5. The Zero-Sum Thinker: Cannot understand that both sides may have legitimate claims and defenses. Picks a side early and ignores contrary evidence.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Business sophistication: Can the juror follow contract interpretation, breach analysis, and damages calculations?
- Big vs. small framing: Does the juror automatically side with the smaller or larger party?
- Contract sanctity: Does the juror believe contracts should be enforced as written, or that fairness should override the text?
- Damages scale: Is the juror comfortable with large damages in a commercial context, or will they reduce because the parties are businesses, not individuals?
- Industry familiarity: Does the juror work in or have opinions about the specific industry involved?
- Fraud skepticism: Does the juror believe business fraud is common or rare?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Business background: Industry experience, contract experience, financial literacy
2. Attitudes toward business disputes: Views on lawsuits between companies, whether businesses should settle, litigation as a tool
3. Contract understanding: Comfort with reading and interpreting written agreements
4. Damages attitudes: Comfort with large damages numbers in commercial context, ability to calculate lost profits or expectation damages
5. Fraud and fairness: Views on business ethics, sharp dealing vs. fraud, sophisticated parties' responsibilities
6. Complexity tolerance: Can the juror engage with a multi-week trial involving extensive documentary evidence?`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe lawsuits between businesses are a waste of the court's time
- Juror states they cannot follow complex financial or contractual evidence
- Juror has a business relationship with a party or competitor
- Juror states they would split the difference rather than determine who is right
- Juror has been involved in a similar business dispute and cannot set that experience aside
- Juror states they believe anyone who sues a business partner is acting in bad faith`,

  inoculation: `KEY INOCULATION TOPICS:
- Commercial disputes involve real harm even though the parties are businesses, not injured individuals
- The contract is the starting point — the jury's job is to determine what it requires, not what seems fair in hindsight
- Lost profits and expectation damages are legitimate and must be calculated based on evidence, not arbitrarily reduced
- Both parties may be sophisticated — that does not mean neither was wronged
- The complexity of the evidence does not mean the issues are unclear`,

  plaintiffRules: `IF REPRESENTING PLAINTIFF:
- Screen for jurors who view commercial litigation as frivolous
- Identify jurors who would reduce damages because both parties are businesses
- Look for jurors who respect contracts and believe breaches should have consequences
- Favorable signals: experience with broken agreements, values accountability, analytical professions`,

  defenseRules: `IF REPRESENTING DEFENSE:
- Screen for anti-corporate bias, especially if the plaintiff is a smaller entity
- Identify jurors who believe the bigger party is always wrong
- Look for jurors who understand business judgment, good-faith disagreements, and contract ambiguity
- Favorable signals: business experience, management roles, comfort with complexity, understanding that not every dispute means someone cheated`
};

const BUSINESS_COMMERCIAL_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Fraud',
    archetypes: `FRAUD OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand the difference between a broken promise and a fraudulent misrepresentation?
- Can the juror evaluate whether reliance on a statement was reasonable given the parties' sophistication?
- Does the juror believe that if someone loses money in a deal, someone must have lied to them?
- Does the juror understand intent requirements — that fraud requires knowing misrepresentation, not just error?`,
    inoculation: `INOCULATION:
- A bad business outcome is not proof of fraud
- Intent and knowledge must be proven, not assumed
- Sophisticated parties have duties to investigate — reliance must be reasonable
- Punitive damages in fraud cases require clear and convincing evidence`
  },
  {
    name: 'Trade Secret',
    archetypes: `TRADE SECRET OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe that employees should be free to use whatever knowledge they gained at a prior job?
- Does the juror understand the difference between general skills/knowledge and protectable trade secrets?
- Has the juror changed jobs in the same industry? Were they subject to a non-compete or NDA?
- Does the juror have strong views about non-compete agreements (oppressive vs. necessary)?`,
    inoculation: `INOCULATION:
- Trade secrets are a specific legal category, not just any business information
- Employees may use general skills and knowledge but not information the employer took reasonable steps to protect
- The company must have actually treated the information as secret — not just labeled it confidential after the fact
- Damages include both the owner's losses and the misappropriator's unjust gains`
  },
  {
    name: 'Construction',
    archetypes: `CONSTRUCTION OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror have construction, contracting, or trades experience? They may substitute personal knowledge for evidence.
- Has the juror had a bad experience with a contractor or a homebuilding project?
- Does the juror understand change orders, punch lists, substantial completion, and contract modification?
- Can the juror follow a dispute involving multiple subcontractors, insurers, and indemnification chains?`,
    inoculation: `INOCULATION:
- Construction disputes often involve shared responsibility among multiple parties
- Change orders and contract modifications can alter the original scope and price
- "Substantial completion" is a defined legal concept, not a subjective standard
- Delays and cost overruns can result from factors beyond any single party's control`
  }
];

// ─── MODULE 05: INTELLECTUAL PROPERTY ───────────────────────────────────────

const IP_BASE: StrategyModule = {
  category: 'Intellectual Property',
  archetypes: `INTELLECTUAL PROPERTY STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Tech Know-It-All: Has enough technical knowledge to be dangerous. Will substitute personal understanding of the technology for the expert testimony and may lead deliberations based on their own conclusions.
2. The Patent Skeptic: Believes the patent system is broken, that patents stifle innovation, and that most patent lawsuits are "trolling." May refuse to enforce a valid patent as a matter of principle.
3. The Complexity Surrenderer: Overwhelmed by technical evidence. Will default to whoever's expert was more likeable or whose attorney explained things more simply, rather than engaging with the substance.
4. The Copycat Sympathizer: Identifies with the accused infringer as a hard-working company that developed its product independently. Views the patent holder as a gatekeeper trying to block innovation.
5. The IP Absolutist: Believes any use of someone else's idea is theft. May find infringement based on surface similarity without engaging with claim construction or the actual scope of protection.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Technical background: Does the juror have relevant technical knowledge? Enough to help or enough to substitute for evidence?
- Patent system attitudes: Does the juror view patents as important protections or as obstacles to innovation?
- Damages scale: Can the juror award reasonable royalties or lost profits in the millions if the evidence supports it?
- Corporate size dynamics: Does the juror automatically favor the larger or smaller entity?
- Innovation values: Does the juror believe inventors deserve protection, or that ideas should be free?
- Complexity tolerance: Can the juror engage with technical testimony for a multi-week trial?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Technical background: Education, profession, familiarity with the technology at issue
2. Patent system attitudes: Views on patents, innovation, IP protection generally
3. Complexity comfort: Ability to follow expert testimony, read claims, evaluate technical evidence
4. Business attitudes: Views on the parties (large corp vs. small inventor, or competitor vs. competitor)
5. Damages comfort: Ability to calculate and award IP damages based on evidence
6. Impartiality: Can the juror follow jury instructions on claim construction and infringement analysis?`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe the patent system is fundamentally unfair or broken
- Juror states they cannot follow complex technical testimony
- Juror works in the specific technology field and cannot set aside personal expertise
- Juror has a financial interest in one party's technology or a competitor's
- Juror states they believe ideas cannot be owned
- Juror states they would not award damages above a certain amount regardless of evidence`,

  inoculation: `KEY INOCULATION TOPICS:
- The court will provide specific instructions on what the patent claims mean — the jury must apply those instructions
- Infringement is determined by comparing the accused product to the patent claims as construed by the court, not by surface similarity
- Damages are calculated based on established methodologies, not gut feeling
- Both parties may have spent significant resources — the size of the parties does not determine who is right`,

  plaintiffRules: `IF REPRESENTING PATENT HOLDER / IP OWNER:
- Screen for patent skepticism and anti-IP attitudes
- Identify jurors who view the lawsuit as "trolling" regardless of the merits
- Look for jurors who respect innovation and believe inventors deserve protection
- Favorable signals: creative or inventive backgrounds, respect for hard work and research, experience with having work copied`,

  defenseRules: `IF REPRESENTING ACCUSED INFRINGER:
- Screen for IP absolutists who equate any similarity with theft
- Identify jurors predisposed to believe the patent holder is the underdog inventor (if they are not)
- Look for jurors who understand independent development, prior art, and that patents have specific boundaries
- Favorable signals: engineering or technical background, understanding of iterative innovation, comfort with the idea that different companies can reach similar solutions independently`
};

const IP_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Patent',
    archetypes: `PATENT OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand that patent claims have specific boundaries and are not about broad concepts?
- Can the juror follow claim construction instructions from the court?
- Does the juror have experience reading technical specifications or schematics?
- Does the juror have strong feelings about pharmaceutical patents, tech patents, or "patent trolls"?`,
    inoculation: `INOCULATION:
- A patent claim is a specific definition of an invention, not a general idea
- The court's claim construction is law that the jury must follow
- Willful infringement requires knowledge and deliberate copying, not just similarity
- Reasonable royalty damages are based on a hypothetical negotiation, not punishment`
  },
  {
    name: 'Trademark/Copyright',
    archetypes: `TRADEMARK / COPYRIGHT OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand the difference between trademark (source identification) and copyright (creative expression)?
- Can the juror evaluate likelihood of confusion without simply asking whether two things look similar?
- Does the juror believe that parody, criticism, and fair use are legitimate defenses or loopholes?
- Has the juror had personal experience with knock-off products, counterfeits, or content copying?`,
    inoculation: `INOCULATION:
- Trademark infringement turns on likelihood of confusion in the marketplace, not mere similarity
- Copyright protects specific expression, not ideas, facts, or concepts
- Fair use is a legal defense with specific factors the jury must weigh
- The strength of the mark or the creativity of the work affects the scope of protection`
  }
];

// ─── MODULE 06: CIVIL RIGHTS ───────────────────────────────────────────────

const CIVIL_RIGHTS_BASE: StrategyModule = {
  category: 'Civil Rights',
  archetypes: `CIVIL RIGHTS / SECTION 1983 STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Blue Line Defender: Automatically sides with law enforcement. Believes officers are always justified and that anyone who sues the police is a criminal looking for a payday.
2. The ACAB Juror: Views all law enforcement as corrupt. Will find liability regardless of the evidence and may want to use the verdict to punish the institution.
3. The Respectability Judge: Evaluates the plaintiff's worthiness based on their criminal history, lifestyle, or appearance rather than whether their constitutional rights were violated.
4. The Government Apologist: Believes government employees generally act in good faith and that second-guessing their decisions from the safety of a courtroom is unfair.
5. The Runaway Damages Juror: So outraged by the misconduct that they want to award a massive verdict to "send a message" without tying damages to actual harm.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Law enforcement attitudes: Does the juror trust, distrust, or have nuanced views about police?
- Authority deference: Does the juror defer to government officials or believe they should be held accountable?
- Plaintiff background bias: Will the juror discount the plaintiff's claim if the plaintiff has a criminal record or was engaged in illegal activity at the time?
- Constitutional values: Does the juror believe constitutional rights apply equally to everyone, including people they disapprove of?
- Damages attitudes: Can the juror award damages for dignitary harm, emotional distress, and constitutional violations that may not involve physical injury?
- Community connection: Does the juror have family or friends in law enforcement or government?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Law enforcement connections: Family, friends, professional relationships with police or government
2. Personal experiences: Interactions with police (positive and negative), encounters with government agencies
3. Authority attitudes: Views on accountability, oversight, and the role of courts in checking government power
4. Constitutional values: Understanding of and commitment to constitutional rights, even for unpopular individuals
5. Damages: Comfort with compensating for constitutional violations, emotional distress, dignitary harm
6. Qualified immunity: Understanding that the legal question is whether the right was clearly established`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they would always believe a police officer's testimony over a civilian's
- Juror states they believe people with criminal records have forfeited their constitutional rights
- Juror has a close family member in law enforcement and cannot set that aside
- Juror states they believe government employees should not be personally liable for on-duty decisions
- Juror states they cannot award emotional distress damages without physical injury
- Juror works for the same government agency being sued`,

  inoculation: `KEY INOCULATION TOPICS:
- Constitutional rights belong to everyone, including people with criminal records or those engaged in illegal activity
- The use of force must be reasonable under the circumstances; the question is what a reasonable officer would have done
- The plaintiff's character or criminal history does not determine whether their rights were violated
- Government accountability through civil rights lawsuits is a feature of the constitutional system, not an abuse of it
- Damages compensate for the violation itself, not just physical injuries`,

  plaintiffRules: `IF REPRESENTING PLAINTIFF:
- Screen aggressively for automatic law enforcement deference
- Identify jurors who will discount the claim based on the plaintiff's background
- Develop cause challenges on jurors who state they cannot evaluate police conduct critically
- Look for jurors who value accountability and believe everyone deserves constitutional protection
- Favorable signals: personal experience being treated unfairly by authority, community activism, education or professional experience involving civil liberties`,

  defenseRules: `IF REPRESENTING GOVERNMENT/DEFENSE:
- Screen for anti-police bias and jurors who view all law enforcement negatively
- Identify jurors who would use the verdict to punish the institution rather than evaluate this specific case
- Look for jurors who understand split-second decision-making, officer safety concerns, and the difficulty of the job
- Favorable signals: respect for public servants, understanding of operational constraints, military or first-responder experience, analytical mindset`
};

const CIVIL_RIGHTS_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Police Excessive Force',
    archetypes: `POLICE EXCESSIVE FORCE OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe officers are ever justified in using force against unarmed individuals?
- Does the juror understand the Graham v. Connor "objective reasonableness" standard?
- Has the juror seen police use-of-force incidents in the news? Have those shaped strong opinions?
- Can the juror evaluate force from the officer's perspective at the moment it was used, without 20/20 hindsight?
- Does the juror have strong views about specific policing techniques (chokeholds, tasers, prone restraint)?`,
    inoculation: `INOCULATION:
- The standard is objective reasonableness at the moment force was used, not hindsight
- Officers are not required to use the least amount of force possible, but the force must be reasonable
- The plaintiff's resistance or noncompliance does not automatically justify any level of force
- Video evidence may not capture everything the officer perceived`
  },
  {
    name: 'Prisoner Rights',
    archetypes: `PRISONER RIGHTS OVERLAY:

ADDITIONAL ARCHETYPES:
- The Forfeiture Believer: Believes incarcerated people gave up all rights when they committed their crime. Cannot accept that prisoners retain constitutional protections.
- The Conditions Denier: Believes prison is supposed to be unpleasant and that complaints about conditions are evidence of entitlement, not genuine harm.`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe prisoners retain constitutional rights including protection from excessive force and deliberate indifference to medical needs?
- Does the juror have family or friends who have been incarcerated? What was their experience?
- Can the juror award damages to a convicted person without reducing the award because of the plaintiff's criminal status?
- Does the juror understand the difference between uncomfortable conditions and unconstitutional conditions?`,
    inoculation: `INOCULATION:
- The Eighth Amendment prohibits cruel and unusual punishment — incarceration does not strip all rights
- Deliberate indifference to serious medical needs is a constitutional violation
- The seriousness of the plaintiff's crime does not determine whether their rights were violated in custody
- Damages are based on the harm suffered from the constitutional violation, not adjusted for the plaintiff's criminal history`
  }
];

// ─── MODULE 07: FAMILY LAW ─────────────────────────────────────────────────

const FAMILY_LAW_BASE: StrategyModule = {
  category: 'Family Law',
  archetypes: `FAMILY LAW STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Bitter Divorcee: Went through a difficult divorce and projects their experience onto the case. May automatically identify with one party based on gender, custody role, or perceived victimhood.
2. The Traditional Values Juror: Has rigid views about gender roles in marriage, parenting, and family structure. May punish a party whose lifestyle or choices conflict with their values.
3. The Child Savior: So focused on protecting children that they cannot objectively evaluate evidence. May make decisions based on emotion rather than the legal standard.
4. The Wealth Punisher: Resentful of the wealthier spouse and motivated to redistribute assets as a matter of perceived fairness rather than law.
5. The Reconciliation Advocate: Believes divorce is wrong or that the parties should work it out. May resent both parties for bringing the matter to court.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Divorce experience: Has the juror been through a divorce? Was it contentious? Who do they relate to?
- Gender role views: Does the juror have fixed beliefs about mothers vs. fathers as primary caregivers, breadwinners, or household managers?
- Parenting philosophy: Does the juror believe in specific parenting approaches that could influence custody evaluations?
- Property attitudes: Does the juror believe marital property should be split 50/50 regardless of circumstances?
- Moral judgments: Will the juror punish a party for infidelity, lifestyle choices, or unconventional family arrangements?
- Children's interests: Can the juror evaluate the best interest of the child analytically rather than emotionally?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Family background: Marital history, divorce experience, co-parenting experience
2. Values and beliefs: Views on marriage, divorce, gender roles, parenting
3. Financial attitudes: Views on property division, spousal support, earning capacity
4. Child welfare: Understanding of children's needs, best interest standard, parenting evaluation
5. Bias exploration: Feelings about the specific family dynamics in this case
6. Impartiality: Ability to follow the legal standards rather than personal values`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe one gender is inherently a better parent
- Juror states they morally oppose divorce and cannot participate fairly
- Juror has an ongoing custody dispute or recent divorce
- Juror states they would punish a party for infidelity in the property division
- Juror states they cannot set aside personal values about family structure`,

  inoculation: ``,

  plaintiffRules: `IF REPRESENTING PETITIONER/PLAINTIFF:
- Screen for gender bias that favors the other parent based on stereotypical assumptions
- Screen for traditional values jurors who will judge lifestyle choices
- Look for jurors who prioritize children's welfare and understand the legal standard
- Favorable signals: experience with co-parenting, understanding of economic imbalance in marriages, analytical approach to family issues`,

  defenseRules: `IF REPRESENTING RESPONDENT/DEFENDANT:
- Screen for bitter divorcees who will project their own experience
- Screen for jurors who will punish based on marital conduct rather than legal standards
- Look for jurors who can evaluate the best interest standard objectively
- Favorable signals: positive co-parenting experience, understanding that both parents can be fit, ability to follow legal instructions over personal values`
};

const FAMILY_LAW_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Custody',
    archetypes: `CUSTODY OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror believe children always belong with their mother? Or that fathers are undervalued in custody decisions?
- Does the juror have personal experience with custody disputes? How did they resolve?
- Can the juror evaluate a best-interest-of-the-child standard without substituting their own parenting values?
- Does the juror understand that both parents can be fit while one arrangement may be better for the child?
- Does the juror have strong views about relocation, non-traditional families, or same-sex parenting?`,
    inoculation: `INOCULATION:
- The legal standard is the best interest of the child, not the rights or preferences of either parent
- A parent's imperfections do not make them unfit unless those imperfections affect the child's welfare
- Stability, continuity, and the child's existing relationships are all legally relevant factors`
  },
  {
    name: 'Termination of Parental Rights',
    archetypes: `TERMINATION OF PARENTAL RIGHTS OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand that termination of parental rights is permanent and among the most serious actions in civil law?
- Has the juror or a family member been involved with child protective services? What was their experience?
- Can the juror hold the State to its burden (typically clear and convincing evidence) rather than ruling on suspicion?
- Does the juror believe the government intervenes too much or too little in family matters?
- Can the juror accept that imperfect parenting does not justify termination?`,
    inoculation: `INOCULATION:
- Termination of parental rights is irrevocable and requires the highest standard of proof in civil cases
- Poverty, unconventional living arrangements, or cultural differences are not grounds for termination
- The State must prove specific statutory grounds, not just that the child might be "better off" elsewhere
- The right to parent is a fundamental constitutional right that cannot be severed on speculation`
  }
];

// ─── MODULE 08: PROBATE / ESTATE ────────────────────────────────────────────

const PROBATE_ESTATE_BASE: StrategyModule = {
  category: 'Probate / Estate',
  archetypes: `PROBATE / ESTATE LITIGATION STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Family Loyalist: Believes family should never fight over money. Views will contests as greedy and disrespectful to the deceased. Will punish the challenger regardless of evidence.
2. The Elder Protector: So concerned about elder exploitation that they assume any unusual estate plan reflects manipulation. May find undue influence based on suspicion rather than evidence.
3. The Testamentary Absolutist: Believes the person who wrote the will had every right to do whatever they wanted with their money. Views any challenge as an attempt to override the decedent's wishes.
4. The Inheritance Entitlement Juror: Believes children and family members are entitled to inherit regardless of what the will says. Sympathizes with disinherited family members.
5. The Caregiver Identifier: Identifies with the person who cared for the decedent and views that caregiver's inheritance as earned, not suspicious.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Family inheritance views: Does the juror believe family members are entitled to inherit, or that the decedent's wishes control?
- Elder exploitation awareness: Does the juror understand undue influence, or do they see it everywhere (or nowhere)?
- Wealth attitudes: Does the juror have strong feelings about inherited wealth, estate planning, or trusts?
- Caregiver dynamics: Does the juror relate to the caregiver or the excluded family members?
- Will formality: Does the juror believe a signed will should always be upheld, or that the circumstances of signing matter?
- Cognitive decline understanding: Does the juror understand the spectrum of capacity, or does any decline equal incapacity?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Personal experience: Has the juror dealt with wills, estates, or family inheritance disputes?
2. Views on testamentary freedom: Does the decedent have the right to leave assets however they choose?
3. Elder dynamics: Understanding of cognitive decline, caregiver relationships, and vulnerability
4. Undue influence understanding: Can the juror evaluate the line between persuasion and coercion?
5. Family obligation: Does the juror believe family members are owed an inheritance?
6. Evidence evaluation: Can the juror assess medical records, witness testimony, and circumstantial evidence of influence?`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror states they believe children should always inherit equally and would not honor a will that excluded a child
- Juror states they believe any will signed by an elderly person with cognitive decline is automatically invalid
- Juror states they have strong personal experience with family inheritance disputes they cannot set aside
- Juror states they believe will contests are always motivated by greed
- Juror has a relationship with an estate planning attorney, fiduciary, or care facility involved in the case`,

  inoculation: `KEY INOCULATION TOPICS:
- Testamentary capacity is a specific legal standard, not the absence of all cognitive decline
- Undue influence requires more than opportunity and motive — it requires proof of actual coercion or manipulation that overcame the decedent's free will
- A person can have dementia and still have testamentary capacity on a particular day
- Changing a will is not inherently suspicious — people's wishes evolve
- The burden of proof and which party bears it varies by jurisdiction and by issue`,

  plaintiffRules: `IF REPRESENTING THE CHALLENGER:
- Screen for jurors who view will contests as inherently greedy
- Identify jurors who believe the decedent's written will is the final word under all circumstances
- Look for jurors who understand vulnerability, power dynamics, and caregiver influence
- Favorable signals: experience caring for elderly relatives, understanding of cognitive decline, skepticism of sudden estate plan changes`,

  defenseRules: `IF REPRESENTING THE PROPONENT/BENEFICIARY:
- Screen for jurors who believe family members are always entitled to inherit
- Identify jurors who assume any unusual estate plan was the product of manipulation
- Look for jurors who respect individual autonomy and testamentary freedom
- Favorable signals: experience with estate planning, understanding that family relationships are complicated, comfort with the idea that a person may choose to leave assets to a caregiver or non-family member`
};

// ─── MODULE 09: INSURANCE ───────────────────────────────────────────────────

const INSURANCE_BASE: StrategyModule = {
  category: 'Insurance',
  archetypes: `INSURANCE LITIGATION STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Premium Worrier: Believes every insurance payout raises everyone's premiums. Will deny or reduce claims to "protect" rates, essentially acting as a defense advocate for the industry.
2. The Insurance Hater: Has had a personal claim denied or badly handled. Cannot evaluate this case without projecting their own experience. May award damages to punish the industry rather than based on the evidence.
3. The Contract Literalist: Believes the policy language is the final word under all circumstances. Cannot accept that ambiguities are resolved against the insurer or that implied duties exist.
4. The Fraud Assumer: Believes most insurance claims are exaggerated or fraudulent. Starts from a position of skepticism about the policyholder.
5. The Industry Insider: Works in insurance or has family in the industry. May identify with the company's claims-handling process and view coverage disputes as legitimate business disagreements.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Insurance experience: Has the juror filed a claim? Was it paid or denied? How did that experience shape their views?
- Industry connections: Does the juror or a family member work in insurance?
- Premium bias: Does the juror believe awarding claims raises everyone's rates?
- Fraud assumptions: Does the juror believe insurance fraud is widespread?
- Contract interpretation: Does the juror default to literal policy language or understand that policies are contracts of adhesion?
- Bad faith understanding: Does the juror believe insurance companies can be held accountable for how they handle claims, or that claim denials are always legitimate business decisions?`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Insurance experience: Personal claims history, industry connections, general attitudes
2. Claims attitudes: Views on claim frequency, fraud, legitimate vs. frivolous claims
3. Company accountability: Can the juror hold an insurance company to its obligations?
4. Premium impact: Can the juror set aside premium concerns and focus on whether this claim was properly handled?
5. Bad faith concepts: Understanding of the duty of good faith, claims handling obligations
6. Damages: Comfort with compensatory and punitive damages against an insurer`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Juror works in the insurance industry and cannot set aside professional loyalty
- Juror states they believe insurance companies always pay legitimate claims and that any denial is justified
- Juror states they would consider the effect on premiums when evaluating damages
- Juror has a pending or recent insurance claim dispute they cannot set aside
- Juror states they believe most insurance claims involve exaggeration or fraud
- Juror has a financial interest in the insurer (stock ownership, retirement plan, etc.)`,

  inoculation: `KEY INOCULATION TOPICS:
- An insurance policy is a contract, and the insurer has a legal duty to honor its terms
- When the insurer drafted the policy and the language is ambiguous, the ambiguity is resolved in favor of coverage
- The duty of good faith and fair dealing requires the insurer to investigate claims reasonably, not to look for reasons to deny
- Punitive damages in bad faith cases serve to deter industry-wide claims-handling abuses
- The premium impact of a single verdict is negligible; the insurer collects premiums specifically to pay claims`,

  plaintiffRules: `IF REPRESENTING POLICYHOLDER:
- Screen aggressively for insurance industry connections and premium-impact bias
- Identify jurors who assume all claims are exaggerated
- Develop cause challenges on jurors who state they cannot award punitive damages against an insurer
- Look for jurors who have had personal experience with unfair claim handling
- Favorable signals: experience being denied a claim, understanding that insurance is a product you pay for, skepticism of large corporations`,

  defenseRules: `IF REPRESENTING INSURER:
- Screen for jurors with strong negative insurance experiences who cannot be fair
- Identify jurors who want to use the verdict to punish the industry generally
- Look for jurors who understand that claim investigation is a legitimate business function
- Favorable signals: business experience, understanding of contractual obligations on both sides, analytical mindset, comfort with the idea that not every denied claim is bad faith`
};

const INSURANCE_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Bad Faith',
    archetypes: `BAD FAITH OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand the difference between a legitimate coverage dispute and bad faith claims handling?
- Can the juror evaluate whether the insurer's investigation was reasonable without substituting hindsight?
- Does the juror understand that bad faith can include unreasonable delay, lowball offers, and failure to investigate, not just outright denial?
- Can the juror award punitive damages if the evidence shows the insurer knowingly disregarded its obligations?`,
    inoculation: `INOCULATION:
- Bad faith is about the process, not the outcome — an insurer can ultimately be right on coverage and still have acted in bad faith in how it handled the claim
- The insurer's internal claims files, guidelines, and communications are relevant to whether it acted reasonably
- A pattern of similar conduct toward other policyholders can be evidence of a claims-handling practice`
  },
  {
    name: 'Coverage Disputes/UM-UIM',
    archetypes: `COVERAGE DISPUTES / UM-UIM OVERLAY:`,
    screeningPoints: `ADDITIONAL SCREENING:
- Does the juror understand that in a UM/UIM case, the policyholder is suing their own insurance company?
- Does the juror find it confusing or troubling to sue a company they pay premiums to? Will that create sympathy for the insurer?
- Can the juror evaluate the underlying tort claim (the accident) and the coverage question separately?
- Does the juror understand policy limits and the concept of underinsured coverage?`,
    inoculation: `INOCULATION:
- UM/UIM coverage exists specifically for this situation — the policyholder paid for this protection
- The policyholder is not suing to "get something extra" — they are asking the insurer to honor the coverage they purchased
- The jury must evaluate the tort claim as if the at-fault driver were sitting in the courtroom`
  }
];

// ─── MODULE 10: GENERAL / FALLBACK ──────────────────────────────────────────

const GENERAL_FALLBACK_BASE: StrategyModule = {
  category: 'General / Fallback',
  archetypes: `GENERAL STRATEGY MODULE

DANGEROUS JUROR ARCHETYPES:
1. The Anti-Litigation Juror: Believes there are too many lawsuits and the courts are clogged. Will hold the bringing party to a higher standard out of principle.
2. The Skeptic: Distrusts all parties and lawyers. Defaults to disbelief and sets an unreasonably high bar for any claim.
3. The Status Quo Defender: Believes the current situation is acceptable and resists change, intervention, or remedy.
4. The Sympathy Voter: Makes decisions based on which party evokes more sympathy rather than the evidence and law.
5. The Underdog Champion: Always sides with the perceived smaller or weaker party regardless of the merits.`,

  biasPatterns: `PRIMARY BIAS PATTERNS TO SCREEN:
- Confirmation bias: Latching onto early impressions and filtering all subsequent evidence through that lens
- Anchoring: Over-relying on the first number, fact, or impression presented
- Authority deference: Automatically crediting testimony from professionals, experts, or officials
- Narrative bias: Preferring the more compelling story regardless of which party bears the burden of proof
- In-group/out-group dynamics: Identifying with parties who share their background and discounting those who differ`,

  questionSequencing: `QUESTION SEQUENCING PRIORITIES:
1. Experience-based: Prior jury service, involvement in lawsuits, relevant life experiences
2. Attitude-based: Views on the legal system, lawsuits, lawyers, and the fairness of trials
3. Theme-specific: Experience with the subject matter of the case, relevant attitudes and beliefs
4. Burden and proof: Understanding of the applicable burden of proof, willingness to follow the law as instructed
5. Damages/remedy: Comfort with the available remedies, willingness to apply them if the evidence supports them
6. Fairness commitment: Ability to be fair to both sides, follow instructions, and deliberate with an open mind`,

  causeChallengeGrounds: `TYPICAL CAUSE-CHALLENGE GROUNDS:
- Relationship with a party, attorney, or witness
- Fixed opinion about the outcome before hearing evidence
- Inability or unwillingness to follow the law as instructed
- Bias based on the type of case, the parties, or the subject matter
- Hardship that would prevent full attention and fair deliberation
- Financial or personal interest in the outcome`,

  inoculation: `KEY INOCULATION TOPICS:
- The burden of proof applies to specific parties — the jury must follow the court's instructions on who bears that burden
- Witness credibility is for the jury to evaluate — no witness is automatically more credible than another
- The jury must decide the case based on the evidence presented in the courtroom, not outside information or personal beliefs
- Both parties have the right to present their case and have it fairly evaluated`,

  plaintiffRules: `IF REPRESENTING PLAINTIFF/PROSECUTION:
- Screen for anti-litigation bias and lawsuit skepticism
- Screen for extreme skepticism that sets an impossibly high bar for the bringing party
- Screen for jurors with close ties to the opposing party or its industry
- Screen for jurors who cannot follow the applicable burden of proof
- Identify favorable jurors: those who value accountability, fairness, and the role of the court system`,

  defenseRules: `IF REPRESENTING DEFENSE:
- Screen for sympathy voters who will decide based on emotion rather than evidence
- Screen for underdog champions who will side with the perceived weaker party
- Screen for jurors who want to use the verdict to "send a message"
- Screen for jurors with personal experiences that create strong identification with the opposing party
- Identify favorable jurors: analytical thinkers, jurors who focus on evidence and instructions, those who value precision and fairness`
};

// ─── ROUTING TABLE ──────────────────────────────────────────────────────────

interface RoutingEntry {
  categoryModule: StrategyModule;
  subSpecOverlay: SubSpecOverlay | null;
}

const ROUTING_TABLE: Record<string, RoutingEntry> = {
  'criminal defense': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: null },
  'criminal prosecution': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: null },
  'criminal law': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: null },
  'capital murder': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[0] },
  'homicide': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[0] },
  'murder': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[0] },
  'manslaughter': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[0] },
  'dui/dwi': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[1] },
  'dui': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[1] },
  'dwi': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[1] },
  'drug offense': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[2] },
  'drug trafficking': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[2] },
  'drug possession': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[2] },
  'sex offense': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[3] },
  'sexual assault': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[3] },
  'rape': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[3] },
  'white collar crime': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[4] },
  'federal crime': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[4] },
  'fraud (criminal)': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[4] },
  'embezzlement': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[4] },
  'domestic violence': { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[5] },

  'personal injury': { categoryModule: PI_TORT_BASE, subSpecOverlay: null },
  'general tort': { categoryModule: PI_TORT_BASE, subSpecOverlay: null },
  'negligence': { categoryModule: PI_TORT_BASE, subSpecOverlay: null },
  'slip and fall': { categoryModule: PI_TORT_BASE, subSpecOverlay: null },
  'premises liability': { categoryModule: PI_TORT_BASE, subSpecOverlay: null },
  'medical malpractice': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[0] },
  'surgical error': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[0] },
  'misdiagnosis': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[0] },
  'products liability': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[1] },
  'defective product': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[1] },
  'wrongful death': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[2] },
  'trucking accident': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[3] },
  'auto accident': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[3] },
  'motor vehicle accident': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[3] },
  'nursing home abuse': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[4] },
  'elder abuse': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[4] },
  'toxic tort': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[5] },
  'environmental contamination': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[5] },
  'mass tort': { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[5] },

  'employment law': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: null },
  'employment discrimination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'wrongful termination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'workplace discrimination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'sexual harassment': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[1] },
  'hostile work environment': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[1] },
  'whistleblower': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[2] },
  'retaliation': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[2] },

  'business dispute': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null },
  'commercial litigation': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null },
  'contract dispute': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null },
  'breach of contract': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null },
  'partnership dispute': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null },
  'fraud': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[0] },
  'business fraud': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[0] },
  'trade secret': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[1] },
  'non-compete': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[1] },
  'construction dispute': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[2] },
  'construction defect': { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[2] },

  'intellectual property': { categoryModule: IP_BASE, subSpecOverlay: null },
  'patent infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[0] },
  'patent': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[0] },
  'trademark': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'copyright': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'trademark infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'copyright infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },

  'civil rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: null },
  'section 1983': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: null },
  'police excessive force': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'police brutality': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'excessive force': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'police shooting': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'prisoner rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },
  'inmate rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },
  'prison conditions': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },

  'family law': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: null },
  'divorce': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: null },
  'custody': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'child custody': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'custody modification': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'termination of parental rights': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[1] },
  'tpr': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[1] },

  'probate': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'estate dispute': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'will contest': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'trust dispute': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'undue influence': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'estate litigation': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },

  'insurance': { categoryModule: INSURANCE_BASE, subSpecOverlay: null },
  'insurance dispute': { categoryModule: INSURANCE_BASE, subSpecOverlay: null },
  'insurance coverage': { categoryModule: INSURANCE_BASE, subSpecOverlay: null },
  'bad faith insurance': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[0] },
  'insurance bad faith': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[0] },
  'um/uim': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[1] },
  'uninsured motorist': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[1] },
  'underinsured motorist': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[1] },
  'coverage dispute': { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[1] },
};

const KEYWORD_FALLBACKS: Array<{ keywords: string[]; entry: RoutingEntry }> = [
  { keywords: ['criminal', 'felony', 'misdemeanor', 'indictment'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: null } },
  { keywords: ['murder', 'homicide', 'killing', 'manslaughter'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[0] } },
  { keywords: ['dui', 'dwi', 'drunk driv', 'impaired driv'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[1] } },
  { keywords: ['drug', 'narcotic', 'controlled substance', 'cocaine', 'heroin', 'fentanyl', 'methamphetamine', 'marijuana'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[2] } },
  { keywords: ['sexual assault', 'rape', 'molestation', 'sex offense', 'indecency'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[3] } },
  { keywords: ['white collar', 'embezzl', 'money launder', 'wire fraud', 'securities fraud'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[4] } },
  { keywords: ['domestic violence', 'family violence', 'assault family', 'protective order violation'], entry: { categoryModule: CRIMINAL_LAW_BASE, subSpecOverlay: CRIMINAL_OVERLAYS[5] } },
  { keywords: ['personal injury', 'tort', 'negligence', 'slip and fall', 'premises'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: null } },
  { keywords: ['malpractice', 'medical error', 'surgical', 'misdiagnos'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[0] } },
  { keywords: ['product', 'defect', 'recall', 'manufacturing defect', 'design defect'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[1] } },
  { keywords: ['wrongful death', 'death claim', 'survival action'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[2] } },
  { keywords: ['truck', 'semi', '18-wheel', 'cdl', 'motor vehicle', 'auto accident', 'car accident', 'car wreck'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[3] } },
  { keywords: ['nursing home', 'elder abuse', 'elder neglect', 'assisted living'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[4] } },
  { keywords: ['toxic', 'environmental', 'contamination', 'pollution', 'asbestos', 'chemical exposure'], entry: { categoryModule: PI_TORT_BASE, subSpecOverlay: PI_TORT_OVERLAYS[5] } },
  { keywords: ['employment', 'fired', 'terminat', 'workplace', 'employer'], entry: { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: null } },
  { keywords: ['discriminat', 'title vii', 'ada', 'age discriminat', 'race discriminat'], entry: { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] } },
  { keywords: ['sexual harassment', 'hostile work', 'quid pro quo'], entry: { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[1] } },
  { keywords: ['whistleblow', 'retaliat', 'qui tam'], entry: { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[2] } },
  { keywords: ['business', 'commercial', 'contract', 'breach'], entry: { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: null } },
  { keywords: ['fraud', 'misrepresent', 'decei'], entry: { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[0] } },
  { keywords: ['trade secret', 'non-compete', 'nda', 'confidential information'], entry: { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[1] } },
  { keywords: ['construction', 'contractor', 'building defect', 'change order'], entry: { categoryModule: BUSINESS_COMMERCIAL_BASE, subSpecOverlay: BUSINESS_COMMERCIAL_OVERLAYS[2] } },
  { keywords: ['patent', 'intellectual property'], entry: { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[0] } },
  { keywords: ['trademark', 'copyright', 'trade dress', 'infringement'], entry: { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] } },
  { keywords: ['civil rights', 'section 1983', '§ 1983', 'constitutional', 'civil liberties'], entry: { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: null } },
  { keywords: ['excessive force', 'police brut', 'police shoot', 'officer-involved'], entry: { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] } },
  { keywords: ['prisoner', 'inmate', 'prison condition', 'jail condition', 'correctional'], entry: { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] } },
  { keywords: ['family law', 'divorce', 'marital', 'spousal'], entry: { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: null } },
  { keywords: ['custody', 'visitation', 'parenting time', 'parenting plan'], entry: { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] } },
  { keywords: ['parental rights', 'tpr', 'child protective', 'cps', 'foster'], entry: { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[1] } },
  { keywords: ['probate', 'estate', 'will contest', 'trust', 'inheritance', 'undue influence', 'testamentary'], entry: { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null } },
  { keywords: ['insurance', 'coverage', 'policy', 'claim denied'], entry: { categoryModule: INSURANCE_BASE, subSpecOverlay: null } },
  { keywords: ['bad faith', 'insurance bad faith'], entry: { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[0] } },
  { keywords: ['um/uim', 'uim', 'uninsured motorist', 'underinsured motorist'], entry: { categoryModule: INSURANCE_BASE, subSpecOverlay: INSURANCE_OVERLAYS[1] } },
];

function resolveRouting(areaOfLaw: string): RoutingEntry {
  const normalized = areaOfLaw.trim().toLowerCase();

  if (ROUTING_TABLE[normalized]) {
    return ROUTING_TABLE[normalized];
  }

  for (const fallback of KEYWORD_FALLBACKS) {
    if (fallback.keywords.some(kw => normalized.includes(kw))) {
      return fallback.entry;
    }
  }

  return { categoryModule: GENERAL_FALLBACK_BASE, subSpecOverlay: null };
}

function assembleSideRules(mod: StrategyModule, side: 'plaintiff' | 'defense'): string {
  return side === 'plaintiff' ? mod.plaintiffRules : mod.defenseRules;
}

export function getStrategyModule(areaOfLaw: string, side: 'plaintiff' | 'defense'): string {
  const { categoryModule, subSpecOverlay } = resolveRouting(areaOfLaw);

  const sections: string[] = [
    `STRATEGY MODULE: ${categoryModule.category}${subSpecOverlay ? ` — ${subSpecOverlay.name}` : ''}`,
    '',
    categoryModule.archetypes,
  ];

  if (subSpecOverlay) {
    sections.push('', subSpecOverlay.archetypes);
  }

  sections.push('', categoryModule.biasPatterns);
  sections.push('', assembleSideRules(categoryModule, side));
  sections.push('', categoryModule.questionSequencing);
  sections.push('', categoryModule.causeChallengeGrounds);
  sections.push('', categoryModule.inoculation);

  if (subSpecOverlay) {
    sections.push('', subSpecOverlay.screeningPoints);
    sections.push('', subSpecOverlay.inoculation);
  }

  return sections.join('\n');
}

export function getArchetypesAndBias(areaOfLaw: string): string {
  const { categoryModule, subSpecOverlay } = resolveRouting(areaOfLaw);

  const sections: string[] = [
    `CASE-SPECIFIC STRATEGY CONTEXT: ${categoryModule.category}${subSpecOverlay ? ` — ${subSpecOverlay.name}` : ''}`,
    '',
    categoryModule.archetypes,
  ];

  if (subSpecOverlay) {
    sections.push('', subSpecOverlay.archetypes);
  }

  sections.push('', categoryModule.biasPatterns);

  return sections.join('\n');
}

export const AREAS_OF_LAW_GROUPED: Array<{ category: string; options: string[] }> = [
  {
    category: 'Criminal Law',
    options: [
      'Criminal Defense',
      'Criminal Prosecution',
      'Capital Murder',
      'Homicide',
      'Manslaughter',
      'DUI/DWI',
      'Drug Offense',
      'Drug Trafficking',
      'Sex Offense',
      'Sexual Assault',
      'White Collar Crime',
      'Federal Crime',
      'Embezzlement',
      'Domestic Violence',
    ],
  },
  {
    category: 'Personal Injury / Tort',
    options: [
      'Personal Injury',
      'Negligence',
      'Slip and Fall',
      'Premises Liability',
      'Medical Malpractice',
      'Surgical Error',
      'Misdiagnosis',
      'Products Liability',
      'Defective Product',
      'Wrongful Death',
      'Trucking Accident',
      'Auto Accident',
      'Motor Vehicle Accident',
      'Nursing Home Abuse',
      'Elder Abuse',
      'Toxic Tort',
      'Environmental Contamination',
      'Mass Tort',
    ],
  },
  {
    category: 'Employment Law',
    options: [
      'Employment Law',
      'Employment Discrimination',
      'Wrongful Termination',
      'Sexual Harassment',
      'Hostile Work Environment',
      'Whistleblower',
      'Retaliation',
    ],
  },
  {
    category: 'Business / Commercial',
    options: [
      'Contract Dispute',
      'Breach of Contract',
      'Business Dispute',
      'Commercial Litigation',
      'Partnership Dispute',
      'Fraud',
      'Business Fraud',
      'Trade Secret',
      'Non-Compete',
      'Construction Dispute',
      'Construction Defect',
    ],
  },
  {
    category: 'Intellectual Property',
    options: [
      'Intellectual Property',
      'Patent Infringement',
      'Patent',
      'Trademark',
      'Trademark Infringement',
      'Copyright',
      'Copyright Infringement',
    ],
  },
  {
    category: 'Civil Rights',
    options: [
      'Civil Rights',
      'Section 1983',
      'Police Excessive Force',
      'Police Brutality',
      'Excessive Force',
      'Prisoner Rights',
      'Inmate Rights',
    ],
  },
  {
    category: 'Family Law',
    options: [
      'Family Law',
      'Divorce',
      'Custody',
      'Child Custody',
      'Custody Modification',
      'Termination of Parental Rights',
    ],
  },
  {
    category: 'Probate / Estate',
    options: [
      'Probate',
      'Estate Dispute',
      'Will Contest',
      'Trust Dispute',
      'Undue Influence',
      'Estate Litigation',
    ],
  },
  {
    category: 'Insurance',
    options: [
      'Insurance',
      'Insurance Dispute',
      'Insurance Coverage',
      'Bad Faith Insurance',
      'Insurance Bad Faith',
      'UM/UIM',
      'Uninsured Motorist',
      'Underinsured Motorist',
      'Coverage Dispute',
    ],
  },
  {
    category: 'Other',
    options: ['Other'],
  },
];

export function isCriminalArea(areaOfLaw: string): boolean {
  const lc = areaOfLaw.toLowerCase();
  return /criminal|felony|misdemeanor|prosecution|capital murder|homicide|manslaughter|dui|dwi|drug offense|drug trafficking|drug possession|sex offense|sexual assault|white collar|federal crime|embezzlement|domestic violence/.test(lc);
}

interface AnalysisTraits {
  favorableTraits: string[];
  riskTraits: string[];
}

interface SidedTraits {
  plaintiff: AnalysisTraits;
  defense: AnalysisTraits;
}

const CATEGORY_TRAITS: Record<string, SidedTraits> = {
  'Criminal Law': {
    plaintiff: {
      favorableTraits: [
        'Respects law enforcement',
        'Prior jury service resulting in conviction',
        'Comfortable rendering guilty verdict',
        'Believes the system generally works',
      ],
      riskTraits: [
        'Deep distrust of law enforcement',
        'Jury nullification risk',
        'Over-identifies with defendant',
        'Extreme skepticism of witness testimony',
        'Refuses to convict on circumstantial evidence',
      ],
    },
    defense: {
      favorableTraits: [
        'Questions authority',
        'Values presumption of innocence',
        'Experience evaluating evidence critically',
        'Believes system sometimes gets it wrong',
        'Prior acquittal experience',
      ],
      riskTraits: [
        'Equates accusation with guilt',
        'Defers to authority and police',
        'Would expect defendant to testify',
        'Pro-law enforcement bias',
        'Punishment-oriented',
      ],
    },
  },
  'Personal Injury / Tort': {
    plaintiff: {
      favorableTraits: [
        'Prior experience wronged by institution',
        'Empathetic without sentimentality',
        'Comfortable awarding full compensation',
        'Believes in accountability',
        'Caregiver or helping profession',
      ],
      riskTraits: [
        'Tort reform advocate',
        'Would cap damages regardless of evidence',
        'Corporate favoritism',
        'Dismissive of non-economic damages',
        'Believes plaintiffs exaggerate injuries',
      ],
    },
    defense: {
      favorableTraits: [
        'Business or management experience',
        'Analytical profession',
        'Understands comparative fault',
        'Values personal responsibility',
        'Comfort that bad outcomes do not equal negligence',
      ],
      riskTraits: [
        'Anti-corporate bias',
        'Automatic sympathy for injured plaintiff',
        'Distrusts defendant industry',
        'Presumes liability from injury alone',
        'Would award damages on sympathy not causation',
      ],
    },
  },
  'Employment Law': {
    plaintiff: {
      favorableTraits: [
        'Has witnessed unfair treatment at work',
        'Non-management role',
        'Understands power dynamics',
        'Empathy for vulnerable positions',
        'Recognizes discrimination can be subtle',
      ],
      riskTraits: [
        'Management identifier who sides with employer',
        'Believes discrimination no longer exists',
        'Requires direct evidence smoking gun',
        'Views employment lawsuits as opportunistic',
        'Silent sufferer who resents plaintiff for suing',
      ],
    },
    defense: {
      favorableTraits: [
        'Management or HR experience',
        'Business ownership background',
        'Understands operational pressures',
        'Comfort that termination can be legitimate',
        'Analytical decision-maker',
      ],
      riskTraits: [
        'Personal grievance against employers',
        'Believes all employers are exploitative',
        'Would use punitive damages to send a message',
        'Projects own workplace resentment',
        'Anti-management bias',
      ],
    },
  },
  'Business / Commercial': {
    plaintiff: {
      favorableTraits: [
        'Experience with broken agreements',
        'Values accountability',
        'Analytical profession',
        'Respects contract enforcement',
        'Comfortable with large commercial damages',
      ],
      riskTraits: [
        'Views commercial litigation as frivolous',
        'Would reduce damages because both parties are businesses',
        'Would split the difference rather than decide',
        'Numbers phobic',
        'Anti-litigation bias',
      ],
    },
    defense: {
      favorableTraits: [
        'Business experience',
        'Management role',
        'Comfort with complexity',
        'Understands good-faith disagreements',
        'Understands contract ambiguity',
      ],
      riskTraits: [
        'Anti-corporate bias toward larger party',
        'Believes bigger party is always wrong',
        'Substitutes own business judgment for evidence',
        'Zero-sum thinker who picks side early',
        'Anti-business sentiment',
      ],
    },
  },
  'Intellectual Property': {
    plaintiff: {
      favorableTraits: [
        'Creative or inventive background',
        'Respects hard work and research',
        'Experience with having work copied',
        'Believes inventors deserve protection',
        'Comfortable with IP damages calculations',
      ],
      riskTraits: [
        'Patent skeptic who sees all IP suits as trolling',
        'Believes ideas should be free',
        'Would refuse to enforce valid patent on principle',
        'Sympathizes with accused infringer automatically',
        'Complexity surrenderer who disengages from evidence',
      ],
    },
    defense: {
      favorableTraits: [
        'Engineering or technical background',
        'Understands independent development',
        'Comfort with iterative innovation',
        'Knows patents have specific boundaries',
        'Analytical and evidence-focused',
      ],
      riskTraits: [
        'IP absolutist who equates any similarity with theft',
        'Predisposed to view patent holder as underdog',
        'Substitutes personal technical knowledge for evidence',
        'Would find infringement on surface similarity alone',
        'Anchors on large damages numbers without analysis',
      ],
    },
  },
  'Civil Rights': {
    plaintiff: {
      favorableTraits: [
        'Values accountability for government actors',
        'Believes everyone deserves constitutional protection',
        'Personal experience with unfair authority treatment',
        'Community activism background',
        'Civil liberties education or experience',
      ],
      riskTraits: [
        'Automatic law enforcement deference',
        'Discounts claims based on plaintiff background',
        'Believes criminal record forfeits constitutional rights',
        'Government apologist',
        'Cannot award emotional distress without physical injury',
      ],
    },
    defense: {
      favorableTraits: [
        'Respects public servants',
        'Understands operational constraints',
        'Military or first-responder experience',
        'Analytical mindset',
        'Understands split-second decision-making',
      ],
      riskTraits: [
        'Anti-police bias',
        'Would use verdict to punish institution',
        'ACAB mentality regardless of evidence',
        'Runaway damages juror motivated by outrage',
        'Cannot evaluate case individually',
      ],
    },
  },
  'Family Law': {
    plaintiff: {
      favorableTraits: [
        'Co-parenting experience',
        'Understands economic imbalance in marriages',
        'Analytical approach to family issues',
        'Prioritizes children welfare',
        'Can follow legal standard over personal values',
      ],
      riskTraits: [
        'Gender bias favoring other parent',
        'Traditional values juror who judges lifestyle',
        'Would punish for infidelity in property division',
        'Reconciliation advocate who resents the lawsuit',
        'Bitter divorcee who projects own experience',
      ],
    },
    defense: {
      favorableTraits: [
        'Positive co-parenting experience',
        'Understands both parents can be fit',
        'Follows legal instructions over personal values',
        'Objective evaluator of best interest standard',
        'Emotionally measured and analytical',
      ],
      riskTraits: [
        'Bitter divorcee projecting own experience',
        'Would punish based on marital conduct not law',
        'Child savior who decides on emotion not evidence',
        'Wealth punisher motivated by redistribution',
        'Fixed gender role views about parenting',
      ],
    },
  },
  'Probate / Estate': {
    plaintiff: {
      favorableTraits: [
        'Experience caring for elderly relatives',
        'Understands cognitive decline',
        'Skeptical of sudden estate plan changes',
        'Understands vulnerability and power dynamics',
        'Recognizes caregiver influence patterns',
      ],
      riskTraits: [
        'Views will contests as greedy',
        'Testamentary absolutist who never questions a will',
        'Identifies with caregiver and views inheritance as earned',
        'Family loyalist who punishes the challenger',
        'Believes signed documents are always final',
      ],
    },
    defense: {
      favorableTraits: [
        'Experience with estate planning',
        'Respects individual autonomy',
        'Understands complicated family relationships',
        'Comfort with non-family beneficiary choices',
        'Values testamentary freedom',
      ],
      riskTraits: [
        'Believes family always entitled to inherit',
        'Assumes unusual estate plan equals manipulation',
        'Elder protector who sees undue influence everywhere',
        'Inheritance entitlement mentality',
        'Would override decedent wishes for perceived fairness',
      ],
    },
  },
  'Insurance': {
    plaintiff: {
      favorableTraits: [
        'Personal experience with unfair claim handling',
        'Understands insurance is a product you pay for',
        'Skepticism of large corporations',
        'Comfortable awarding punitive damages',
        'Holds companies to contractual obligations',
      ],
      riskTraits: [
        'Insurance industry connections',
        'Premium-impact bias',
        'Assumes all claims are exaggerated',
        'Contract literalist who ignores adhesion context',
        'Fraud assumer who starts from skepticism',
      ],
    },
    defense: {
      favorableTraits: [
        'Business experience',
        'Understands contractual obligations on both sides',
        'Analytical mindset',
        'Comfort that not every denial is bad faith',
        'Understands claim investigation is legitimate',
      ],
      riskTraits: [
        'Strong negative insurance experience',
        'Would use verdict to punish industry generally',
        'Insurance hater who projects own experience',
        'Cannot evaluate claim objectively',
        'Predisposed to find bad faith in any denial',
      ],
    },
  },
  'General / Fallback': {
    plaintiff: {
      favorableTraits: [
        'Values accountability and fairness',
        'Respects the court system',
        'Open-minded evaluator of evidence',
        'Comfortable with applicable damages',
        'Follows burden of proof instructions',
      ],
      riskTraits: [
        'Anti-litigation bias',
        'Extreme skepticism of all claims',
        'Status quo defender who resists remedy',
        'Anchors on first impression',
        'Authority-deferential regardless of evidence',
      ],
    },
    defense: {
      favorableTraits: [
        'Analytical thinker',
        'Focuses on evidence and instructions',
        'Values precision and fairness',
        'Can separate sympathy from evidence',
        'Evaluates each claim on its merits',
      ],
      riskTraits: [
        'Sympathy voter driven by emotion',
        'Underdog champion regardless of merits',
        'Would use verdict to send a message',
        'Strong identification with opposing party',
        'Narrative-driven rather than evidence-driven',
      ],
    },
  },
};

const OVERLAY_TRAITS: Record<string, { favorableTraits?: string[]; riskTraits?: string[] }> = {
  'Capital/Homicide': {
    riskTraits: ['Death penalty absolutist', 'Life-means-life doubter'],
  },
  'DUI/DWI': {
    riskTraits: ['Personal connection to drunk driving tragedy', 'Social drinker in denial'],
  },
  'Drug Offenses': {
    riskTraits: ['Zero-tolerance on all drug offenses', 'Believes addiction is a character flaw'],
  },
  'Sex Offenses': {
    riskTraits: ['Views any sexual accusation as automatically credible', 'Stigma voter who prejudges on charge alone'],
  },
  'White Collar/Federal': {
    riskTraits: ['Anti-corporate populist', 'Overwhelmed by financial complexity'],
  },
  'Domestic Violence': {
    riskTraits: ['Survivor advocate who projects own experience', 'Reconciliation skeptic who doubts ongoing contact'],
  },
  'Medical Malpractice': {
    riskTraits: ['Doctor worshipper who views physicians as infallible', 'System blamer who finds liability in any bad outcome'],
  },
  'Products Liability': {
    riskTraits: ['User-error default who blames the plaintiff', 'Anti-regulation libertarian'],
  },
  'Wrongful Death': {
    riskTraits: ['Grief projector who cannot evaluate analytically', 'Uncomfortable placing dollar value on life'],
  },
  'Trucking/Auto Accident': {
    favorableTraits: ['Understands trucking regulatory obligations'],
  },
  'Nursing Home/Elder Abuse': {
    riskTraits: ['Guilt deflector minimizing institutional failures', 'Industry insider normalizing staffing problems'],
  },
  'Toxic Tort/Environmental': {
    riskTraits: ['Causation skeptic demanding certainty', 'Jobs-vs-environment voter protecting industry'],
  },
  'Discrimination': {
    riskTraits: ['Believes workplace discrimination is a thing of the past'],
  },
  'Sexual Harassment': {
    riskTraits: ['High threshold setter who dismisses workplace banter', 'Blame shifter toward victim'],
  },
  'Whistleblower/Retaliation': {
    riskTraits: ['Views whistleblowers as disloyal traitors'],
  },
  'Fraud': {
    riskTraits: ['Believes any business loss means someone lied'],
  },
  'Trade Secret': {
    riskTraits: ['Believes employees should use any knowledge from prior jobs'],
  },
  'Construction': {
    riskTraits: ['Substitutes personal construction experience for evidence'],
  },
  'Patent': {
    riskTraits: ['Strong feelings about patent trolls'],
  },
  'Trademark/Copyright': {
    riskTraits: ['Believes parody and fair use are just loopholes'],
  },
  'Police Excessive Force': {
    riskTraits: ['Shaped by media use-of-force incidents', 'Strong views on specific policing techniques'],
  },
  'Prisoner Rights': {
    riskTraits: ['Forfeiture believer who denies prisoner rights', 'Conditions denier who thinks prison should be harsh'],
  },
  'Custody': {
    riskTraits: ['Fixed belief children always belong with one gender', 'Substitutes own parenting values for legal standard'],
  },
  'Termination of Parental Rights': {
    riskTraits: ['Believes government intervenes too little in families', 'Cannot hold State to clear and convincing standard'],
  },
  'Bad Faith': {
    riskTraits: ['Cannot distinguish coverage dispute from bad faith'],
  },
  'Coverage Disputes/UM-UIM': {
    riskTraits: ['Confused or troubled by suing own insurer'],
  },
};

export function getAnalysisTraits(areaOfLaw: string, side: 'plaintiff' | 'defense'): AnalysisTraits {
  const { categoryModule, subSpecOverlay } = resolveRouting(areaOfLaw);
  const categoryName = categoryModule.category;

  const catTraits = CATEGORY_TRAITS[categoryName] || CATEGORY_TRAITS['General / Fallback'];
  const base = catTraits[side];

  const result: AnalysisTraits = {
    favorableTraits: [...base.favorableTraits],
    riskTraits: [...base.riskTraits],
  };

  if (subSpecOverlay) {
    const overlayData = OVERLAY_TRAITS[subSpecOverlay.name];
    if (overlayData) {
      if (overlayData.favorableTraits) {
        result.favorableTraits.push(...overlayData.favorableTraits);
      }
      if (overlayData.riskTraits) {
        result.riskTraits.push(...overlayData.riskTraits);
      }
    }
  }

  return result;
}
