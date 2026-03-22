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
  archetypes: `DANGEROUS JUROR ARCHETYPES — CRIMINAL LAW

For the Prosecution:
• The Anti-Government Libertarian — Deeply distrusts law enforcement and government authority. Believes police routinely lie and the system is rigged against defendants. Will hold the State to an impossibly high standard and may nullify regardless of evidence.
• The "Reasonable Doubt Absolutist" — Interprets reasonable doubt as requiring near-certainty. Will find any hypothetical scenario, however implausible, sufficient to create doubt. Refuses to rely on circumstantial evidence.
• The Personal Experience Victim Identifier — Has been wrongly accused, arrested, or knows someone who was. Projects that experience onto the defendant. Cannot separate their story from the case.
• The Contrarian Holdout — Enjoys disagreeing with authority and group consensus. Will hold out in deliberations to feel powerful. Often presents as intellectual or independent.

For the Defense:
• The Law-and-Order Absolutist — Believes if someone is charged, they are probably guilty. Trusts police implicitly. Sees defense attorneys as obstacles to justice. Will convict on weak evidence to "keep the streets safe."
• The Victim Advocate — Strong emotional identification with crime victims. Cannot separate sympathy for the victim from the legal standard of proof. Prior victimization or close ties to victims of similar crimes.
• The Punishment-First Thinker — Focused on consequences and sentencing before guilt is established. Believes harsh sentences deter crime. May convict to "send a message."
• The "Common Sense" Juror — Dismisses legal technicalities and constitutional protections as "loopholes." Relies on gut feeling over evidence. Finds constitutional safeguards frustrating.`,

  biasPatterns: `BIAS PATTERNS — CRIMINAL LAW
• Prior victimization bias — Jurors who have been victims of crime (especially similar crimes) may over-identify with the complainant and presume guilt
• Authority deference bias — Some jurors automatically credit law enforcement testimony over civilian testimony
• Media exposure bias — Pretrial publicity, true crime consumption, or general "crime wave" perceptions can create presumption of guilt
• Demographic projection bias — Jurors may project their assumptions about the defendant's race, age, or appearance onto guilt determination
• "Where there's smoke" bias — Belief that the mere fact of arrest or indictment indicates guilt
• CSI Effect — Unrealistic expectations about forensic evidence (DNA, fingerprints) from television; cuts both ways depending on whether forensic evidence exists`,

  questionSequencing: `QUESTION SEQUENCING — CRIMINAL LAW
1. Experience-based: Prior jury service, prior involvement with the justice system (witness, victim, accused), family/friends in law enforcement or corrections
2. Attitude-based: Views on the criminal justice system, whether the system is fair, feelings about the burden of proof
3. Theme-specific: Attitudes about the specific crime type charged, prior experience with similar situations, media exposure
4. Presumption and burden: Whether the juror can truly presume innocence, whether they understand the State bears the full burden, whether they require the defendant to testify
5. Law enforcement credibility: Whether police officers' testimony is automatically more credible, whether officers can make mistakes or lie
6. Punishment considerations: Whether knowledge of potential punishment would affect deliberations, views on sentencing severity`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — CRIMINAL LAW
• Stated inability to presume innocence ("I think if they're charged, there's probably a reason")
• Refusal to hold the State to the burden of proof ("I'd need to hear from the defendant too")
• Admitted bias based on the type of crime charged ("I could never be fair in a [drug/sex/DUI] case")
• Close relationship with law enforcement that prevents impartial evaluation of officer testimony
• Prior victimization of the same crime type where the juror states they cannot set aside that experience
• Fixed opinion on guilt or punishment before hearing evidence
• Stated belief that defense attorneys who represent guilty people are morally wrong`,

  inoculation: `INOCULATION TOPICS — CRIMINAL LAW
• The defendant may choose not to testify — and that is a constitutional right, not evidence of guilt
• The defense is not required to present any evidence or call any witnesses
• Circumstantial evidence is legally equivalent to direct evidence if it meets the standard
• Police officers are witnesses like any other and their testimony should be evaluated the same way
• A not guilty verdict does not mean the juror believes nothing happened — it means the State did not prove its case beyond a reasonable doubt
• The juror may hear about evidence that was excluded and must not speculate about why`,

  plaintiffRules: `PROSECUTION SCREENING RULES — CRIMINAL LAW
• Screen for anti-law-enforcement sentiment — jurors who distrust police, believe officers routinely lie, or have had negative encounters with law enforcement
• Screen for "reasonable doubt absolutists" who set an impossibly high bar for proof
• Screen for jurors with personal experience being accused, arrested, or convicted — especially if they feel the system treated them unfairly
• Screen for nullification risk — jurors who believe they can ignore the law if they disagree with it
• Screen for jurors who express strong opposition to the specific criminal statute at issue
• Identify favorable jurors: those with law enforcement connections, prior crime victimization (on the complaining side), military/security backgrounds, rule-followers who value order and accountability`,

  defenseRules: `DEFENSE SCREENING RULES — CRIMINAL LAW
• Screen for automatic deference to law enforcement — jurors who say they would believe an officer over a civilian "because of the badge"
• Screen for "where there's smoke" bias — jurors who admit the mere fact of indictment suggests guilt
• Screen for prior victimization of the same crime type — especially if they describe ongoing emotional impact
• Screen for punishment-focused jurors who want to "send a message" or discuss sentencing before hearing evidence
• Screen for jurors who cannot commit to requiring the State to prove every element beyond a reasonable doubt
• Screen for jurors uncomfortable with constitutional protections (right to silence, exclusionary rule, right to counsel)
• Identify favorable jurors: independent thinkers, those with personal or family experience with wrongful accusations, skeptics of government power, jurors who value individual rights`
};

const CRIMINAL_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Capital/Homicide',
    archetypes: `ADDITIONAL ARCHETYPES — CAPITAL/HOMICIDE
• The Death Penalty Advocate — Believes certain crimes automatically deserve death. Cannot meaningfully consider life as an alternative. May minimize mitigating evidence to reach a death verdict.
• The Absolute Abolitionist — Morally opposed to the death penalty under all circumstances. Cannot impose death regardless of the evidence. Will nullify at the penalty phase.
• The Grief Projector — Cannot separate their own fear of violent death from deliberation. May be overwhelmed by autopsy photos or victim impact testimony.`,
    screeningPoints: `SCREENING — CAPITAL/HOMICIDE
• Death qualification: Can the juror consider BOTH life imprisonment and death as potential sentences? A juror who can only consider one is challengeable for cause.
• Exposure to violent media or personal violence — does it desensitize or traumatize?
• Religious or moral beliefs about the sanctity of life, forgiveness, or retribution
• Whether the juror can follow mitigation instructions — considering the defendant's background, mental health, age, and circumstances
• Prior experience with murder, violent crime, or loss of a loved one to violence
• Whether the juror understands that a life sentence means the defendant will die in prison`,
    inoculation: `INOCULATION — CAPITAL/HOMICIDE
• The jury will see graphic evidence — autopsy photos, crime scene images. Can the juror view this evidence and still deliberate rationally without being overwhelmed?
• Mitigating evidence is not an excuse — it is context the law requires the jury to consider
• A life sentence without parole means exactly that — the defendant will never leave prison`
  },
  {
    name: 'DUI/DWI',
    archetypes: `ADDITIONAL ARCHETYPES — DUI/DWI
• The MADD Sympathizer — Has lost someone to a drunk driver or is deeply connected to anti-DUI advocacy. Cannot be impartial regardless of the specific facts.
• The Social Drinker Minimizer — Believes everyone drives after a few drinks and DUI laws are overly harsh. May nullify or refuse to convict on principle.
• The Field Sobriety Test Skeptic — Believes standardized field sobriety tests are junk science. Distrusts breathalyzer/blood test accuracy.`,
    screeningPoints: `SCREENING — DUI/DWI
• Personal experience with alcohol or substance abuse — self, family, or close friends
• Has the juror or someone close been injured or killed by a drunk/impaired driver?
• Attitudes about social drinking, acceptable blood alcohol levels, and personal driving behavior
• Knowledge of or opinions about breathalyzer/blood test reliability
• Views on whether DUI laws are too harsh, too lenient, or appropriate
• Prior DUI arrests or convictions (self or family)`,
    inoculation: `INOCULATION — DUI/DWI
• Breathalyzer and blood test machines require calibration and maintenance — results are not infallible
• Field sobriety tests are subjective evaluations conducted under stressful conditions
• The legal limit is a legislative decision, not a scientific certainty about impairment
• A person can fail a field sobriety test while completely sober due to medical conditions, nervousness, or physical limitations`
  },
  {
    name: 'Drug Offenses',
    archetypes: `ADDITIONAL ARCHETYPES — DRUG OFFENSES
• The War-on-Drugs Believer — Believes all drug users are criminals who destroy communities. No tolerance for drug activity regardless of context or amount.
• The Legalization Advocate — Believes drug laws are unjust, especially for marijuana. May nullify because they disagree with the statute.
• The Addiction-as-Disease Juror — Views addiction as a medical condition. May sympathize with the defendant to the point of ignoring distribution evidence.`,
    screeningPoints: `SCREENING — DRUG OFFENSES
• Personal or family history of addiction or substance abuse
• Views on drug legalization, decriminalization, or the war on drugs
• Neighborhood impact — has the juror been personally affected by drug activity in their community?
• Views on mandatory minimum sentencing for drug offenses
• Whether the juror distinguishes between personal use and distribution
• Attitudes about confidential informants and undercover operations`,
    inoculation: `INOCULATION — DRUG OFFENSES
• Confidential informants are a common and legal tool — their testimony should be evaluated like any witness
• The quantity of drugs and the circumstances determine the charge, not the juror's personal views on drug policy
• Addiction does not excuse distribution or trafficking
• Undercover operations and controlled buys are standard law enforcement techniques, not entrapment`
  },
  {
    name: 'Sex Offenses',
    archetypes: `ADDITIONAL ARCHETYPES — SEX OFFENSES
• The Automatic Believer — Believes all accusers and cannot fathom that a sexual assault allegation could be false or exaggerated. "Why would someone lie about this?"
• The False Accusation Crusader — Believes false accusations are rampant. Distrusts all complainants. May have personal experience with a false accusation.
• The Trauma-Triggered Juror — Survivor of sexual assault or close to a survivor. May be re-traumatized by testimony and cannot deliberate objectively.`,
    screeningPoints: `SCREENING — SEX OFFENSES
• Personal history of sexual assault or abuse — self, family, or close friends (handle with extreme sensitivity)
• #MeToo movement attitudes — does the juror believe accusers should always be believed?
• Views on false accusations — how common does the juror think they are?
• Comfort level hearing graphic sexual testimony
• Views on consent, especially in cases involving alcohol or relationships
• Whether the juror can convict on testimony alone without physical evidence
• Attitudes about delayed reporting — why a victim might wait to come forward`,
    inoculation: `INOCULATION — SEX OFFENSES
• Delayed reporting is common in sexual assault cases and does not indicate fabrication
• The absence of physical evidence does not mean an assault did not occur
• Victims of trauma may have fragmented or inconsistent memories — this is a documented neurological response
• The defendant's character or reputation does not determine guilt or innocence
• Consent is a factual question for the jury — not a moral judgment about the parties' behavior`
  },
  {
    name: 'White Collar/Federal',
    archetypes: `ADDITIONAL ARCHETYPES — WHITE COLLAR/FEDERAL
• The Anti-Corporate Populist — Believes all wealthy people and corporations are corrupt. Will convict based on class resentment rather than evidence.
• The Business Sympathizer — Understands business complexity and may excuse fraudulent conduct as "just how business works" or "aggressive but not criminal."
• The Document Phobic — Cannot process large volumes of financial documents, spreadsheets, or email evidence. Will tune out during complex testimony.`,
    screeningPoints: `SCREENING — WHITE COLLAR/FEDERAL
• Financial literacy — can the juror understand financial statements, wire transfers, and corporate structures?
• Attitudes about wealth, corporations, and financial regulation
• Prior experience with fraud — as a victim, perpetrator, or witness
• Views on government regulation and enforcement agencies (SEC, FBI, IRS)
• Ability to sit through a lengthy trial with complex documentary evidence
• Understanding that intent is a key element — "I didn't know it was wrong" is relevant to criminal fraud
• Views on whistleblowers and cooperating witnesses`,
    inoculation: `INOCULATION — WHITE COLLAR/FEDERAL
• Complex financial transactions are not inherently suspicious — the question is whether there was intent to defraud
• Cooperating witnesses who received plea deals have a motive to testify but that does not automatically make their testimony unreliable
• The government must prove criminal intent — negligence or poor judgment alone is not fraud
• Business records and emails will be the primary evidence — the jury must be willing to review them carefully`
  },
  {
    name: 'Domestic Violence',
    archetypes: `ADDITIONAL ARCHETYPES — DOMESTIC VIOLENCE
• The "Why Didn't They Leave" Juror — Cannot understand why a victim stays in an abusive relationship. May blame the victim or doubt the severity.
• The Cycle-of-Violence Expert — Has personal experience with DV (as victim or advocate) and may project their experience onto the case facts.
• The Mutual Combat Believer — Believes most DV cases are "both sides fighting" and may minimize the defendant's conduct.`,
    screeningPoints: `SCREENING — DOMESTIC VIOLENCE
• Personal experience with domestic violence — as victim, accused, witness, or in family
• Views on why victims stay in abusive relationships
• Attitudes about self-defense in the domestic context
• Whether the juror believes DV is a private family matter or a criminal justice issue
• Experience with protective orders — as petitioner, respondent, or witness
• Views on recanting victims — does the juror understand why a victim might recant?
• Gender-based assumptions about who can be a victim or perpetrator`,
    inoculation: `INOCULATION — DOMESTIC VIOLENCE
• Victims of domestic violence often recant or refuse to cooperate — this is a documented pattern of the abuse cycle, not evidence of fabrication
• Domestic violence can occur without visible injuries
• The relationship between the parties does not diminish the seriousness of the charges
• Self-defense in the domestic context requires the same legal analysis as any other self-defense claim`
  }
];

// ─── MODULE 02: PERSONAL INJURY / TORT ──────────────────────────────────────

const PI_TORT_BASE: StrategyModule = {
  category: 'Personal Injury / Tort',
  archetypes: `DANGEROUS JUROR ARCHETYPES — PERSONAL INJURY / TORT

For the Plaintiff:
• The Tort Reform Warrior — Believes lawsuits are destroying America. Reads about "frivolous lawsuits" and thinks most plaintiffs are faking or exaggerating. Will cap damages regardless of evidence.
• The Corporate Apologist — Works for or identifies with large companies. Believes businesses should not be punished for accidents. Sees regulation as government overreach.
• The Personal Responsibility Absolutist — Believes people are entirely responsible for their own safety. "If you got hurt, you should have been more careful." Minimizes defendant's negligence.
• The Damages Skeptic — Cannot award large verdicts. Believes pain and suffering are subjective and shouldn't be compensated with money. Will anchor to medical bills only.

For the Defense:
• The Sympathy Voter — Deeply empathetic juror who will award based on the plaintiff's suffering regardless of liability. Cannot separate sympathy from the legal standard.
• The Anti-Corporate Crusader — Believes all corporations are greedy and negligent. Will punish the defendant to "send a message" regardless of the specific facts.
• The Jackpot Juror — Sees the trial as an opportunity to award a massive verdict. Excited about large numbers. May have financial stress that colors their view.
• The Prior Claimant — Has filed personal injury claims before and had positive experiences. Identifies with the plaintiff's position and process.`,

  biasPatterns: `BIAS PATTERNS — PERSONAL INJURY / TORT
• "McDonald's coffee" bias — Media-driven belief that most lawsuits are frivolous, affecting jurors' willingness to award fair damages
• Anchoring bias — Jurors anchor to the first number they hear (medical bills, insurance policy limits) and resist adjusting upward for non-economic damages
• Invisible injury skepticism — Bias against injuries that cannot be seen (soft tissue, chronic pain, PTSD, TBI) vs. visible injuries (broken bones, scars)
• Litigation frequency bias — Belief that too many lawsuits exist and that filing suit is itself suspect
• Contributory fault inflation — Tendency to assign more fault to the plaintiff than the evidence supports because "they should have been more careful"
• Sympathy-to-liability confusion — Conflating feeling sorry for the plaintiff with finding the defendant liable`,

  questionSequencing: `QUESTION SEQUENCING — PERSONAL INJURY / TORT
1. Experience-based: Prior injuries, prior lawsuits (as plaintiff or defendant), insurance claims, Workers' Comp experience
2. Attitude-based: Views on the civil justice system, lawsuit culture, tort reform, whether there are too many lawsuits
3. Theme-specific: Attitudes about the specific type of injury, corporate responsibility, safety standards
4. Damages and money: Comfort with large verdicts, understanding of non-economic damages, attitudes about pain and suffering compensation
5. Burden and proof: Understanding of preponderance of the evidence standard, comparative fault concepts
6. Specific fact inoculation: Addressing potentially damaging facts (pre-existing conditions, gaps in treatment, social media)`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — PERSONAL INJURY / TORT
• Stated refusal to award non-economic damages ("I don't believe in paying for pain and suffering")
• Admission that they would cap damages regardless of evidence ("I could never award more than X")
• Stated belief that filing a lawsuit is wrong or that most plaintiffs are faking
• Close relationship with a party, attorney, or key witness
• Employment relationship that creates bias (works for defendant's company, insurer, or industry)
• Prior negative experience as a defendant in a lawsuit that prevents impartiality
• Stated inability to follow the law on comparative fault, burden of proof, or damages`,

  inoculation: `INOCULATION TOPICS — PERSONAL INJURY / TORT
• Pre-existing conditions can be aggravated by negligence — the defendant takes the plaintiff as they find them (eggshell plaintiff rule)
• Gaps in treatment do not mean the plaintiff was not injured — financial, logistical, and psychological barriers to care exist
• Non-economic damages (pain, suffering, loss of enjoyment of life) are real and recognized by the law
• The plaintiff bears the burden of proof by a preponderance of the evidence — more likely than not
• Insurance is not relevant to liability or damages (or: insurance may be mentioned depending on jurisdiction)
• The amount the plaintiff asks for is not the amount the jury must award — it is the amount the evidence supports`,

  plaintiffRules: `PLAINTIFF SCREENING RULES — PERSONAL INJURY / TORT
• Screen for tort reform attitudes — jurors who believe there are too many lawsuits or that verdicts are too high
• Screen for corporate identification — jurors who work in the defendant's industry or identify with business interests
• Screen for damages skeptics — jurors who cannot award non-economic damages or are uncomfortable with large numbers
• Screen for personal responsibility absolutists who will inflate the plaintiff's comparative fault
• Screen for invisible injury skeptics if the case involves soft tissue, chronic pain, or psychological injuries
• Identify favorable jurors: those with prior injury experience, healthcare workers who understand pain, union members, community-minded jurors who value accountability`,

  defenseRules: `DEFENSE SCREENING RULES — PERSONAL INJURY / TORT
• Screen for anti-corporate bias — jurors who express hostility toward businesses, insurance companies, or "big companies"
• Screen for prior claimants — jurors who have filed lawsuits and had large awards or positive litigation experiences
• Screen for sympathy-driven jurors who cannot separate empathy from the legal standard
• Screen for jackpot mentality — jurors who are excited about large verdicts or see the trial as a windfall opportunity
• Screen for jurors with financial stress who may project their needs onto the damages calculation
• Identify favorable jurors: business owners, management-level employees, jurors with engineering or safety backgrounds who understand risk management, fiscally conservative jurors`
};

const PI_TORT_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Medical Malpractice',
    archetypes: `ADDITIONAL ARCHETYPES — MEDICAL MALPRACTICE
• The Doctor Worshipper — Reveres physicians and cannot believe a doctor would make a serious error. "Doctors are doing their best in difficult situations."
• The Healthcare System Critic — Has had terrible healthcare experiences and blames all doctors. Will punish the defendant doctor for the system's failings.
• The Outcome-Equals-Malpractice Juror — Believes any bad medical outcome means someone made a mistake. Cannot distinguish between a known complication and negligence.`,
    screeningPoints: `SCREENING — MEDICAL MALPRACTICE
• Personal or family relationships with healthcare providers — doctors, nurses, hospital administrators
• Prior medical malpractice experience — as patient, family member, or healthcare worker accused
• Understanding that a bad outcome alone does not equal malpractice
• Attitudes about the difficulty of practicing medicine and the role of informed consent
• Whether the juror can evaluate competing expert medical testimony
• Views on the medical profession generally — trust level, prior negative experiences
• Understanding of standard of care as a legal concept`,
    inoculation: `INOCULATION — MEDICAL MALPRACTICE
• Informed consent means the patient was told about risks — it does not mean the patient consented to negligence
• A known complication is different from a preventable error
• Expert witnesses on both sides are qualified — the jury must weigh their opinions
• Standard of care is what a reasonable physician in the same specialty would do — not perfection`
  },
  {
    name: 'Products Liability',
    archetypes: `ADDITIONAL ARCHETYPES — PRODUCTS LIABILITY
• The Consumer Blame Juror — "If the product was dangerous, why did they use it?" Blames the consumer for not reading warnings or using the product differently.
• The Over-Regulation Critic — Believes government safety regulations are excessive and companies shouldn't be punished for making products people choose to buy.
• The Design Engineer Defender — Has engineering background and sympathizes with design trade-offs. May excuse known defects as acceptable risk-benefit decisions.`,
    screeningPoints: `SCREENING — PRODUCTS LIABILITY
• Engineering or manufacturing background — may understand design trade-offs too sympathetically
• Consumer safety attitudes — does the juror believe manufacturers have a duty to make products safe?
• Experience with product recalls or defective products
• Views on warning labels — are they sufficient protection or corporate cover?
• Attitudes about government regulation of product safety (CPSC, FDA, NHTSA)
• Whether the juror can apply strict liability concepts if instructed`,
    inoculation: `INOCULATION — PRODUCTS LIABILITY
• Warning labels do not eliminate a manufacturer's duty to design safe products
• A product can be defective even if it is used as intended
• Companies know about risks through internal testing — the question is what they did with that knowledge
• The cost of making a product safer is relevant but does not excuse ignoring known dangers`
  },
  {
    name: 'Wrongful Death',
    archetypes: `ADDITIONAL ARCHETYPES — WRONGFUL DEATH
• The Emotional Shutout — Cannot handle the emotional weight of a death case. May rush deliberations to escape discomfort, resulting in lower damages.
• The "Life Has No Price" Literalist — Believes putting a dollar value on a human life is morally wrong. May award either nothing or an irrational amount.
• The Grief Assessor — Judges the family's grief and demeanor in court. If they seem "too composed" or "not sad enough," questions the sincerity of the claim.`,
    screeningPoints: `SCREENING — WRONGFUL DEATH
• Recent personal loss — can the juror sit through testimony about death without being overwhelmed?
• Comfort with valuing a human life in monetary terms
• Attitudes about survival actions vs. wrongful death damages
• Whether the juror will judge the surviving family's courtroom demeanor
• Views on loss of consortium, companionship, and guidance claims
• Religious or philosophical beliefs about death that might affect damages deliberation`,
    inoculation: `INOCULATION — WRONGFUL DEATH
• The law requires the jury to place a monetary value on the loss — this is the only way the justice system can provide a remedy
• How a family grieves in public is not evidence of the depth of their loss
• Future lost earnings and future companionship are real, calculable damages
• The fact that someone has died does not automatically mean someone is legally responsible — liability must still be proven`
  },
  {
    name: 'Trucking/Auto Accident',
    archetypes: `ADDITIONAL ARCHETYPES — TRUCKING/AUTO ACCIDENT
• The "Accidents Happen" Minimizer — Believes car and truck accidents are an unavoidable part of life. Reluctant to assign blame or award significant damages.
• The Truck Driver Sympathizer — Understands the difficulty of trucking and may excuse violations of hours-of-service rules or maintenance requirements.
• The Comparative Fault Maximizer — Will scrutinize the plaintiff's driving behavior to assign fault even when the defendant clearly caused the collision.`,
    screeningPoints: `SCREENING — TRUCKING/AUTO ACCIDENT
• CDL holders or family members who drive trucks commercially
• Personal experience with serious car or truck accidents
• Views on distracted driving, speeding, and traffic law enforcement
• Understanding of federal motor carrier safety regulations (if trucking case)
• Attitudes about the trucking industry and corporate fleet safety
• Whether the juror has been at fault in an accident and how that experience shapes their view`,
    inoculation: `INOCULATION — TRUCKING/AUTO ACCIDENT
• Federal hours-of-service regulations exist because fatigued driving is as dangerous as drunk driving
• Trucking companies have a duty to maintain their vehicles and monitor their drivers
• The severity of injuries does not always correlate with the visual damage to vehicles
• Electronic logging devices (ELDs) and black box data provide objective evidence of driver behavior`
  },
  {
    name: 'Nursing Home/Elder Abuse',
    archetypes: `ADDITIONAL ARCHETYPES — NURSING HOME/ELDER ABUSE
• The "Old People Die" Nihilist — Believes elderly patients in nursing homes are expected to decline. Minimizes neglect because "they were already sick."
• The Guilt-Ridden Family Member — Has placed a family member in a nursing home and feels guilty. May over-identify with the plaintiff's family or, conversely, become defensive about the facility.
• The Staffing Realist — Understands nursing homes are understaffed and underfunded. May excuse neglect as a systemic problem rather than the facility's fault.`,
    screeningPoints: `SCREENING — NURSING HOME/ELDER ABUSE
• Personal experience with nursing homes — as family decision-maker, visitor, or employee
• Attitudes about elder care quality and expectations
• Views on corporate-owned vs. independently operated care facilities
• Whether the juror will judge the family for placing the elder in a facility
• Understanding of staffing ratios, regulatory requirements, and minimum standards of care
• Emotional capacity to view bedsore photos, weight loss documentation, and other evidence of neglect`,
    inoculation: `INOCULATION — NURSING HOME/ELDER ABUSE
• Placing a loved one in a nursing home is not abandonment — families rely on these facilities to provide professional care
• Nursing homes accept payment to provide a specific standard of care — they are legally bound to meet it
• Bedsores, dehydration, and falls are preventable with proper staffing and protocols
• Corporate ownership structures and profit-driven cost cutting can directly cause neglect`
  },
  {
    name: 'Toxic Tort/Environmental',
    archetypes: `ADDITIONAL ARCHETYPES — TOXIC TORT/ENVIRONMENTAL
• The "Prove the Molecule" Skeptic — Demands direct proof of individual causation at the molecular level. Cannot accept epidemiological or statistical evidence.
• The Environmental Absolutist — Believes all industrial activity is harmful and all companies are polluters. Will find liability based on ideology rather than evidence.
• The Regulatory Compliance Defender — Believes that if a company followed government regulations, it cannot be liable. "If the EPA said it was okay, it was okay."`,
    screeningPoints: `SCREENING — TOXIC TORT/ENVIRONMENTAL
• Scientific literacy — can the juror evaluate expert testimony about dose-response, exposure pathways, and epidemiology?
• Views on environmental regulation and corporate environmental responsibility
• Personal experience with environmental contamination or pollution
• Attitudes about industries involved (chemical, oil/gas, manufacturing, mining)
• Whether the juror understands that regulatory compliance does not immunize against liability
• Ability to process lengthy scientific and medical evidence
• Proximity to industrial sites or personal connection to environmental issues`,
    inoculation: `INOCULATION — TOXIC TORT/ENVIRONMENTAL
• Regulatory compliance sets minimum standards — a company can comply with regulations and still be negligent
• Epidemiological evidence (population studies) is a valid way to prove causation when individual exposure cannot be measured directly
• The effects of toxic exposure may take years or decades to manifest
• Companies have internal documents showing what they knew about risks — the jury must evaluate whether they acted on that knowledge`
  }
];

// ─── MODULE 03: EMPLOYMENT LAW ─────────────────────────────────────────────

const EMPLOYMENT_BASE: StrategyModule = {
  category: 'Employment Law',
  archetypes: `DANGEROUS JUROR ARCHETYPES — EMPLOYMENT LAW

For the Plaintiff (Employee):
• The Management Loyalist — Has been in management for years and identifies with the employer's decision-making. Believes most terminations are justified. "Companies don't fire people without good reason."
• The Anti-Litigation Employee — Has never sued an employer despite workplace problems. Views employees who sue as disloyal or unable to handle normal workplace friction.
• The "At-Will" Absolutist — Believes employers can fire anyone for any reason and that employment lawsuits are an overreach. Does not distinguish between at-will termination and discriminatory termination.
• The HR Defender — Works in or has worked in HR. Identifies with the company's compliance processes. Believes documentation and progressive discipline prove fairness.

For the Defense (Employer):
• The Workplace Crusader — Has been mistreated at work and never got justice. Will use this case to vindicate their own experience. Projects their story onto the plaintiff.
• The Union Activist — Strong pro-worker ideology. Distrusts all management decisions and assumes corporate malice.
• The Emotional Reactor — Will be so outraged by testimony about workplace mistreatment that they cannot analyze liability objectively. Awards large verdicts on emotion alone.
• The Discrimination Absolutist — Believes discrimination is pervasive and any adverse employment action against a protected class member is discriminatory.`,

  biasPatterns: `BIAS PATTERNS — EMPLOYMENT LAW
• "I'd never sue my employer" bias — Jurors who value loyalty and conflict avoidance may judge plaintiffs for filing suit
• Management vs. labor identification — Jurors naturally align with either the employer or employee based on their own work history
• Just-world thinking — "Bad things happen to people who deserve them" — belief that the plaintiff must have done something wrong
• Documentation bias — Overreliance on paper trails; if the employer documented performance issues, it must be true
• Protected class projection — Jurors from the same protected class may over-identify; jurors from different groups may not see the discrimination
• Retaliation blindness — Difficulty seeing the connection between protected activity and adverse action when there is a time gap`,

  questionSequencing: `QUESTION SEQUENCING — EMPLOYMENT LAW
1. Experience-based: Employment history, management vs. line worker, experience with hiring/firing decisions, workplace conflicts
2. Attitude-based: Views on workplace lawsuits, whether they've considered suing an employer, attitudes about employee rights vs. employer rights
3. Theme-specific: Experience with discrimination, harassment, or retaliation (self or close others), views on workplace diversity and inclusion
4. Damages: Understanding of lost wages, emotional distress damages, punitive damages in the employment context
5. Specific fact inoculation: Performance issues, mixed-motive situations, comparator evidence`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — EMPLOYMENT LAW
• Stated belief that employment lawsuits are always frivolous or that employees should "just find another job"
• Close relationship with a party, attorney, or key witness
• Works for or has significant financial interest in the defendant company or its competitor
• Prior experience as a defendant in an employment lawsuit
• Stated inability to award emotional distress or punitive damages
• Expressed belief that discrimination based on the specific protected class at issue does not exist or is not a real problem`,

  inoculation: `INOCULATION TOPICS — EMPLOYMENT LAW
• Performance documentation can be pretextual — companies sometimes create a paper trail after the decision to terminate has already been made
• The timing of adverse action relative to protected activity is relevant evidence
• Mixed-motive cases: the employer may have had both legitimate and discriminatory reasons — the question is whether discrimination was a motivating factor
• Emotional distress from losing a job is real — employment is tied to identity, financial security, and self-worth
• "At-will" employment does not mean employers can fire someone for an illegal reason`,

  plaintiffRules: `PLAINTIFF (EMPLOYEE) SCREENING RULES — EMPLOYMENT LAW
• Screen for management loyalists who automatically side with employer decisions
• Screen for "at-will absolutists" who believe employers can fire anyone for any reason
• Screen for jurors in HR or compliance roles who identify with the company's processes
• Screen for jurors who have never considered filing a workplace complaint despite experiencing problems — they may judge the plaintiff for doing so
• Screen for just-world thinkers who believe the plaintiff must have done something wrong
• Identify favorable jurors: those who have experienced workplace mistreatment, union members, jurors from the same protected class, advocates for fairness and equality`,

  defenseRules: `DEFENSE (EMPLOYER) SCREENING RULES — EMPLOYMENT LAW
• Screen for jurors who have been fired or disciplined and feel it was unfair — they will identify with the plaintiff
• Screen for strong pro-worker ideology or union activism
• Screen for jurors who have personally experienced discrimination and carry unresolved anger
• Screen for emotional reactors who will be swayed by sympathy rather than evidence
• Screen for jurors who distrust all corporations or management
• Identify favorable jurors: business owners, managers, HR professionals, jurors who value documentation and process, those with experience making difficult termination decisions`
};

const EMPLOYMENT_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Discrimination',
    archetypes: `ADDITIONAL ARCHETYPES — DISCRIMINATION
• The "I Don't See Color" Juror — Claims to be colorblind or gender-blind. Cannot recognize implicit bias or systemic patterns. "If the plaintiff was qualified, they would have been promoted."
• The Reverse Discrimination Advocate — Believes protected classes receive preferential treatment. Sees discrimination claims as "playing the race/gender card."
• The Pattern Recognizer — Has witnessed workplace discrimination and will connect dots that may not exist in this specific case.`,
    screeningPoints: `SCREENING — DISCRIMINATION
• Personal experience with discrimination — based on race, sex, age, disability, religion, national origin
• Views on systemic discrimination vs. individual incidents
• Attitudes about diversity initiatives, affirmative action, and equal opportunity
• Whether the juror believes the specific type of discrimination at issue (race, sex, age, etc.) is still a real problem
• Comfort evaluating statistical evidence of discriminatory patterns
• Views on implicit bias — does the juror believe unconscious bias exists?`,
    inoculation: `INOCULATION — DISCRIMINATION
• Discrimination is rarely overt in the modern workplace — it often manifests through patterns, timing, and differential treatment
• Comparator evidence (how similar employees from different groups were treated) is powerful evidence of intent
• An employer can have a diverse workforce and still discriminate against individual employees
• The plaintiff does not need a "smoking gun" email or statement — circumstantial evidence is sufficient`
  },
  {
    name: 'Sexual Harassment',
    archetypes: `ADDITIONAL ARCHETYPES — SEXUAL HARASSMENT
• The "Boys Will Be Boys" Juror — Believes workplace flirtation and crude humor are harmless. Sets an extremely high bar for what constitutes harassment.
• The #MeToo Skeptic — Believes the #MeToo movement has gone too far and people are too sensitive. Sympathizes with accused harassers.
• The Workplace Romance Complicator — Focuses on whether the plaintiff may have initially welcomed attention, participated in office culture, or sent mixed signals.`,
    screeningPoints: `SCREENING — SEXUAL HARASSMENT
• Personal experience with sexual harassment — as target, accused, or bystander
• Attitudes about workplace behavior standards and what crosses the line
• Views on the #MeToo movement and its impact on workplace culture
• Whether the juror distinguishes between a hostile work environment and quid pro quo harassment
• Comfort hearing graphic testimony about sexual conduct in the workplace
• Gender dynamics — how the juror's own gender and workplace experience shapes their view
• Views on reporting — whether the juror judges people who don't report immediately`,
    inoculation: `INOCULATION — SEXUAL HARASSMENT
• A harassment victim's failure to report immediately does not mean the harassment did not occur — fear of retaliation is a documented reason for delayed reporting
• Participating in workplace culture (laughing at jokes, attending social events) does not mean the plaintiff welcomed the specific harassing conduct
• A single incident can constitute harassment if it is sufficiently severe
• The employer's liability depends on what it knew and what it did about it`
  },
  {
    name: 'Whistleblower/Retaliation',
    archetypes: `ADDITIONAL ARCHETYPES — WHISTLEBLOWER/RETALIATION
• The Company Loyalist — Believes employees who report wrongdoing are disloyal troublemakers. "If you don't like it, quit."
• The Whistleblower Hero — Idolizes whistleblowers and will assume the employer retaliated regardless of the evidence.
• The Procedure Follower — Believes the employee should have gone through internal channels first and judges external reporting harshly.`,
    screeningPoints: `SCREENING — WHISTLEBLOWER/RETALIATION
• Has the juror ever reported wrongdoing at work? What happened?
• Views on employee loyalty vs. duty to report illegal or unethical conduct
• Attitudes about government reporting channels (OSHA, SEC, EEOC)
• Whether the juror believes companies actually retaliate or if employees use "retaliation" as an excuse for poor performance
• Experience with workplace investigations — as complainant, witness, or subject
• Views on temporal proximity — does the juror find it suspicious when adverse action follows closely after protected activity?`,
    inoculation: `INOCULATION — WHISTLEBLOWER/RETALIATION
• Employees are protected by law when they report illegal activity — retaliation for reporting is itself illegal
• The temporal proximity between protected activity and adverse action is relevant evidence of retaliatory intent
• The employer does not need to admit retaliation — intent can be proven through circumstantial evidence
• An employee does not need to be right about the underlying complaint — they only need to have had a reasonable, good-faith belief`
  }
];

// ─── MODULE 04: BUSINESS / COMMERCIAL ───────────────────────────────────────

const BUSINESS_COMMERCIAL_BASE: StrategyModule = {
  category: 'Business / Commercial',
  archetypes: `DANGEROUS JUROR ARCHETYPES — BUSINESS / COMMERCIAL

For the Plaintiff:
• The "Business Is Business" Juror — Believes sharp dealing is expected in commerce. "Buyer beware." Reluctant to award damages for contract disputes because both parties should have protected themselves.
• The Contract Literalist — Will focus exclusively on the written contract and refuse to consider implied terms, course of dealing, or equitable principles.
• The Anti-Litigation Business Person — Has been sued in business and believes most commercial lawsuits are attempts to renegotiate bad deals.

For the Defense:
• The Anti-Corporate Populist — Sees all business disputes as "big company vs. little guy" regardless of the actual parties. Will punish the larger entity.
• The Promise Keeper Absolutist — Believes any broken promise should be severely punished regardless of context, changed circumstances, or mitigation.
• The Emotional Fraud Reactor — Will react emotionally to allegations of fraud and skip the technical analysis of reliance, materiality, and damages.`,

  biasPatterns: `BIAS PATTERNS — BUSINESS / COMMERCIAL
• David vs. Goliath framing — Jurors sympathize with the smaller party regardless of the merits
• Business sophistication assumption — Belief that a sophisticated party should have anticipated and prevented the problem
• "A deal is a deal" rigidity — Unwillingness to consider changed circumstances, impossibility, or equitable defenses
• Damages confusion — Difficulty distinguishing between expectation damages, reliance damages, and consequential damages
• Fraud conflation — Treating every broken promise as fraud rather than a breach of contract
• Complexity fatigue — Tuning out during testimony about complex business transactions, financial statements, or technical contract terms`,

  questionSequencing: `QUESTION SEQUENCING — BUSINESS / COMMERCIAL
1. Experience-based: Business ownership, contract experience, prior commercial litigation, investment experience
2. Attitude-based: Views on business ethics, handshake deals vs. written contracts, corporate behavior
3. Theme-specific: Understanding of the industry involved, experience with similar transactions
4. Damages: Comfort with calculating lost profits, understanding of mitigation, views on punitive damages in business cases
5. Complexity tolerance: Ability to process financial documents, accounting testimony, and expert economic analysis`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — BUSINESS / COMMERCIAL
• Financial interest in one of the parties (shareholder, customer, vendor, competitor)
• Prior business dispute with one of the parties
• Stated belief that all business lawsuits are frivolous or that courts should not be involved in business disputes
• Employment or professional relationship with a key witness or expert
• Stated inability to follow instructions on the measure of damages or burden of proof
• Prior experience in a substantially similar business dispute that prevents impartiality`,

  inoculation: `INOCULATION TOPICS — BUSINESS / COMMERCIAL
• Contracts can be breached by sophisticated parties — sophistication does not prevent breach
• Lost profits are a real and calculable form of damages
• The duty to mitigate does not excuse the breach — it limits damages but does not eliminate liability
• Fraud requires proof of intentional misrepresentation — not just a broken promise
• Expert testimony about damages calculations is evidence the jury should evaluate carefully`,

  plaintiffRules: `PLAINTIFF SCREENING RULES — BUSINESS / COMMERCIAL
• Screen for "buyer beware" attitudes that shift all risk to the plaintiff
• Screen for contract literalists who will ignore equitable principles and contextual evidence
• Screen for jurors who have been defendants in business lawsuits and carry anti-plaintiff bias
• Screen for industry insiders who may sympathize with the defendant's business practices
• Identify favorable jurors: those with experience being cheated in business, small business owners who value trust and fairness, jurors who understand that contracts create enforceable obligations`,

  defenseRules: `DEFENSE SCREENING RULES — BUSINESS / COMMERCIAL
• Screen for anti-corporate bias and David-vs-Goliath thinking
• Screen for jurors who have been wronged in business transactions and carry unresolved anger
• Screen for promise-keeper absolutists who will punish any breach severely
• Screen for jurors who react emotionally to fraud allegations without analyzing the legal elements
• Identify favorable jurors: business owners, managers, and executives who understand commercial realities; jurors with contract drafting or negotiation experience; those who value evidence over emotion`
};

const BUSINESS_COMMERCIAL_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Fraud',
    archetypes: `ADDITIONAL ARCHETYPES — FRAUD
• The "Everyone Lies in Business" Cynic — Believes misrepresentation is standard business practice. Sets an impossibly high bar for what constitutes actionable fraud.
• The Scam Victim — Has been defrauded personally and will project that experience. May see fraud where none exists.
• The Intent Denier — Cannot distinguish between an honest mistake and intentional deception. "How can you prove what someone was thinking?"`,
    screeningPoints: `SCREENING — FRAUD
• Personal experience with fraud — as victim or accused
• Understanding of the distinction between breach of contract and fraud
• Ability to evaluate evidence of intent (emails, testimony, course of conduct)
• Views on whether "everyone lies in business" or whether there are meaningful lines
• Comfort evaluating circumstantial evidence of fraudulent intent
• Understanding that reliance must be reasonable`,
    inoculation: `INOCULATION — FRAUD
• Fraud requires intent to deceive — not just a broken promise or a change in business circumstances
• Reliance must be reasonable — the jury evaluates whether a reasonable person in the plaintiff's position would have believed the representation
• Intent can be proven through circumstantial evidence — patterns of behavior, concealment of information, inconsistent statements
• The measure of damages for fraud may differ from breach of contract damages`
  },
  {
    name: 'Trade Secret',
    archetypes: `ADDITIONAL ARCHETYPES — TRADE SECRET
• The "Information Should Be Free" Juror — Believes knowledge should not be owned. Skeptical of trade secret claims. "If it's not patented, it's not protected."
• The Corporate Espionage Alarmist — Assumes any employee who changes jobs is stealing secrets. Will find misappropriation based on the job change alone.
• The Non-Compete Hater — Views trade secret and non-compete claims as corporate attempts to control workers. Sympathizes with the departing employee.`,
    screeningPoints: `SCREENING — TRADE SECRET
• Experience changing jobs and bringing knowledge to a new employer
• Views on non-compete agreements and employee mobility
• Understanding that general skills and knowledge are different from trade secrets
• Experience in industries where trade secrets are common (tech, pharma, manufacturing)
• Attitudes about corporate ownership of employee-developed knowledge
• Whether the juror has signed NDAs or non-competes and how they feel about them`,
    inoculation: `INOCULATION — TRADE SECRET
• A trade secret does not need to be patented to be protected — the company must take reasonable measures to keep it secret
• Employees can take their general skills and knowledge to a new job — they cannot take specific proprietary information
• Reasonable measures to protect secrecy include NDAs, restricted access, and marking documents as confidential
• The value of a trade secret is its secrecy — once disclosed, the competitive advantage is destroyed`
  },
  {
    name: 'Construction',
    archetypes: `ADDITIONAL ARCHETYPES — CONSTRUCTION
• The DIY Expert — Has construction experience and will second-guess expert testimony based on personal knowledge. May substitute their own standards for industry standards.
• The "You Get What You Pay For" Juror — Believes the property owner chose the cheapest bid and should expect problems. Unsympathetic to claims against contractors.
• The Anti-Contractor Juror — Has had a bad experience with a contractor. Will project that experience onto the case.`,
    screeningPoints: `SCREENING — CONSTRUCTION
• Construction industry experience — as worker, contractor, owner, or inspector
• Home renovation or building experience and satisfaction level
• Understanding of construction contracts, change orders, and industry practices
• Experience with construction defect claims (as claimant or defendant)
• Attitudes about building codes and code enforcement
• Understanding of multi-party construction disputes (owner, GC, sub, design professional)`,
    inoculation: `INOCULATION — CONSTRUCTION
• Building codes establish minimum safety standards — compliance does not preclude negligence
• Change orders are a normal part of construction — they reflect evolving project needs, not mismanagement
• Construction defects may be latent — not visible until years after completion
• The general contractor is responsible for the subcontractor's work — this is standard industry practice`
  }
];

// ─── MODULE 05: INTELLECTUAL PROPERTY ───────────────────────────────────────

const IP_BASE: StrategyModule = {
  category: 'Intellectual Property',
  archetypes: `DANGEROUS JUROR ARCHETYPES — INTELLECTUAL PROPERTY

For the Plaintiff (IP Owner):
• The "Ideas Are Free" Juror — Believes intellectual property should not be owned. Skeptical of IP rights in general. May associate patent claims with "patent trolls."
• The Open Source Advocate — Believes information and innovation should be freely shared. Hostile to IP enforcement.
• The Complexity Avoider — Will tune out during technical testimony and vote based on which party seems more sympathetic rather than the evidence.

For the Defense (Accused Infringer):
• The Inventor Sympathizer — Strong belief in protecting inventors and creators. Will side with the patent/copyright holder regardless of the strength of the claim.
• The Brand Loyalist — Strong attachment to the defendant's brand or products. Cannot be objective about allegations that their favorite company infringes IP.
• The "Stealing Is Wrong" Simplifier — Reduces complex IP disputes to simple theft narratives. "They stole the idea. Pay up."`,

  biasPatterns: `BIAS PATTERNS — INTELLECTUAL PROPERTY
• "Patent troll" bias — Media-driven belief that most patent lawsuits are filed by non-practicing entities trying to extract settlements
• Technical complexity avoidance — Jurors who cannot process technical testimony may default to sympathy or narrative
• Inventor romanticism — Over-identification with the "lone inventor" narrative regardless of the patent's actual merit
• Brand loyalty interference — Jurors who use or admire the defendant's products may be unable to find infringement
• Damages inflation/deflation — Difficulty grasping reasonable royalty calculations or lost profits in technology contexts`,

  questionSequencing: `QUESTION SEQUENCING — INTELLECTUAL PROPERTY
1. Experience-based: Technical background, invention or creative work, familiarity with patents or copyrights
2. Attitude-based: Views on intellectual property rights, patent trolls, innovation protection
3. Theme-specific: Understanding of the technology or creative work at issue, industry familiarity
4. Damages: Comfort with reasonable royalty calculations, understanding of lost profits, views on the value of innovation
5. Complexity tolerance: Ability to process claim construction, prior art analysis, and technical expert testimony`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — INTELLECTUAL PROPERTY
• Works for or has financial interest in either party or a direct competitor
• Has a patent or IP portfolio that creates identification bias
• Stated belief that patents/copyrights should not exist or that all IP lawsuits are frivolous
• Technical expertise in the exact field at issue that would substitute for testimony
• Prior involvement in IP litigation as a party, witness, or consultant
• Stated inability to follow the court's claim construction or legal instructions`,

  inoculation: `INOCULATION TOPICS — INTELLECTUAL PROPERTY
• A patent does not mean the invention is the best or most innovative — it means it meets specific legal criteria
• Claim construction (what the patent covers) is a legal determination — the judge will instruct on the claim scope
• A non-practicing entity (someone who doesn't make products) can still validly hold and enforce patents
• Independent development is relevant to willfulness but not to infringement — you can infringe even if you didn't know about the patent`,

  plaintiffRules: `PLAINTIFF (IP OWNER) SCREENING RULES — INTELLECTUAL PROPERTY
• Screen for "ideas should be free" attitudes and open-source ideology
• Screen for patent troll bias — does the juror believe most patent lawsuits are frivolous?
• Screen for jurors who use or admire the defendant's products and cannot be objective
• Screen for complexity avoiders who will tune out during technical testimony
• Identify favorable jurors: inventors, engineers who have patented their work, creators who understand the value of IP, small business owners who rely on proprietary methods`,

  defenseRules: `DEFENSE (ACCUSED INFRINGER) SCREENING RULES — INTELLECTUAL PROPERTY
• Screen for inventor romanticists who will side with any patent holder
• Screen for "stealing is wrong" simplifiers who reduce complex IP to a theft narrative
• Screen for jurors with their own patents or creative works who over-identify with the plaintiff
• Screen for jurors hostile to the defendant's industry
• Identify favorable jurors: those who understand competitive markets, jurors who value independent innovation, tech-savvy jurors who can evaluate prior art and claim scope`
};

const IP_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Patent',
    archetypes: `ADDITIONAL ARCHETYPES — PATENT
• The Prior Art Evangelist — Believes every patent has prior art that invalidates it. Focused on invalidity even before hearing the evidence.
• The Patent System Critic — Believes the patent system is broken and abused. Cannot fairly evaluate a patent infringement claim.
• The Licensing Math Phobic — Cannot process reasonable royalty calculations, Georgia-Pacific factors, or comparable license analysis.`,
    screeningPoints: `SCREENING — PATENT
• Technical background in the field of the patent — helps with comprehension but may substitute personal knowledge for testimony
• Prior patent litigation experience as a party, expert, or consultant
• Views on the patent system — is it working or broken?
• Ability to understand claim construction and infringement analysis
• Comfort with damages calculations involving hypothetical negotiations and reasonable royalties
• Views on standard-essential patents and FRAND obligations (if applicable)`,
    inoculation: `INOCULATION — PATENT
• The judge will instruct on claim construction — the jury applies those constructions to the accused product
• Prior art must specifically teach or suggest the claimed invention — general knowledge in the field is not enough
• A reasonable royalty is a legal construct — it is what the parties would have agreed to in a hypothetical negotiation
• Willful infringement requires knowledge of the patent and deliberate decision to infringe`
  },
  {
    name: 'Trademark/Copyright',
    archetypes: `ADDITIONAL ARCHETYPES — TRADEMARK/COPYRIGHT
• The Fair Use Absolutist — Believes any non-commercial use is automatically fair use. Over-applies fair use principles regardless of the facts.
• The Consumer Confusion Denier — Cannot believe consumers would be confused between two products or marks. "People aren't that dumb."
• The Copying Is Flattery Juror — Minimizes copying as a natural part of creative industries. "Everyone borrows ideas."`,
    screeningPoints: `SCREENING — TRADEMARK/COPYRIGHT
• Creative background — artists, musicians, writers, designers who understand IP from the creator's perspective
• Consumer experience with counterfeit or knockoff products
• Views on fair use, parody, and transformative works
• Brand awareness and loyalty that might affect objectivity
• Understanding of the difference between trademark (source identification) and copyright (creative expression)
• Experience with brand confusion in the marketplace`,
    inoculation: `INOCULATION — TRADEMARK/COPYRIGHT
• Fair use is a legal defense with specific factors — it is not an automatic exemption for any non-commercial use
• Consumer confusion is evaluated based on the hypothetical reasonable consumer, not whether the jurors personally would be confused
• The strength of a mark and the similarity of the goods/services are key factors in trademark infringement
• Copyright protection attaches automatically — registration is not required for protection, only for statutory damages`
  }
];

// ─── MODULE 06: CIVIL RIGHTS ───────────────────────────────────────────────

const CIVIL_RIGHTS_BASE: StrategyModule = {
  category: 'Civil Rights',
  archetypes: `DANGEROUS JUROR ARCHETYPES — CIVIL RIGHTS

For the Plaintiff:
• The Blue Line Loyalist — Unwavering support for law enforcement. Cannot believe officers would violate constitutional rights. "They have a tough job and we should support them."
• The "Comply and You'll Be Fine" Juror — Believes citizens who are injured by government actors brought it on themselves by not complying with instructions.
• The Government Defender — Believes lawsuits against government entities waste taxpayer money. Reluctant to find liability against public institutions.
• The Qualified Immunity Sympathizer — Believes government officials should not be held personally liable for doing their jobs, even when they make mistakes.

For the Defense (Government/Official):
• The ACLU Activist — Believes government actors routinely violate civil rights. Will find liability on principle rather than facts.
• The Prior Victim — Has personally experienced what they perceive as government overreach or civil rights violations. Will project their experience onto the case.
• The Punitive Damages Crusader — Wants to punish the government or institution severely to "change the system." Focused on systemic reform rather than the specific case.`,

  biasPatterns: `BIAS PATTERNS — CIVIL RIGHTS
• Pro-authority bias — Automatic deference to law enforcement, corrections officers, or government officials
• Race-based credibility gaps — Differential assessment of plaintiff credibility based on race, national origin, or socioeconomic status
• Qualified immunity confusion — Difficulty separating the legal standard from their personal feelings about when officials should be liable
• Taxpayer resentment — Belief that verdicts against government entities come out of the juror's pocket
• "Bad apple" vs. systemic thinking — Tendency to see misconduct as individual rather than institutional, or vice versa
• Delayed reporting skepticism — Questioning why the plaintiff did not file a complaint sooner`,

  questionSequencing: `QUESTION SEQUENCING — CIVIL RIGHTS
1. Experience-based: Interactions with law enforcement or government agencies, personal or family experience with civil rights issues
2. Attitude-based: Views on law enforcement, government accountability, the balance between safety and civil liberties
3. Theme-specific: Experience with the specific type of civil rights violation at issue, views on qualified immunity, Section 1983 litigation
4. Damages: Understanding of compensatory and punitive damages against government defendants, taxpayer impact concerns
5. Credibility and proof: Willingness to evaluate conflicting accounts between citizens and officials without defaulting to authority`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — CIVIL RIGHTS
• Employment by or close relationship with the defendant government entity
• Stated inability to find against a law enforcement officer ("I always believe the police")
• Close family member in law enforcement who would create loyalty bias
• Stated belief that civil rights lawsuits waste taxpayer money or are always frivolous
• Personal involvement in a similar civil rights dispute that prevents impartiality
• Stated inability to award damages against a government entity`,

  inoculation: `INOCULATION TOPICS — CIVIL RIGHTS
• Government officials have a duty to respect constitutional rights — the Constitution limits government power, not citizen behavior
• The fact that law enforcement has a difficult job does not excuse constitutional violations
• Damages in civil rights cases serve two purposes: compensating the victim and deterring future violations
• Qualified immunity is a legal defense — the court will instruct on when it applies. The jury's job is to determine the facts.
• A citizen does not forfeit their constitutional rights by being non-compliant, rude, or uncooperative`,

  plaintiffRules: `PLAINTIFF SCREENING RULES — CIVIL RIGHTS
• Screen for Blue Line loyalists who cannot fairly evaluate officer conduct
• Screen for "comply and survive" attitudes that blame the victim
• Screen for taxpayer resentment — jurors who view verdicts as wasting their money
• Screen for jurors with law enforcement family members whose loyalty will override objectivity
• Screen for jurors who believe civil rights violations are rare or exaggerated
• Identify favorable jurors: civil libertarians, those with negative law enforcement experiences (if they can be fair), community organizers, jurors who value constitutional protections, those who have witnessed or experienced government overreach`,

  defenseRules: `DEFENSE (GOVERNMENT/OFFICIAL) SCREENING RULES — CIVIL RIGHTS
• Screen for jurors who have personally experienced or witnessed civil rights violations — especially if unresolved
• Screen for ACLU/activist types who will find liability on principle
• Screen for anti-government ideology that extends beyond the specific case
• Screen for jurors who want to "send a message" through punitive damages
• Screen for jurors who cannot separate the individual officer from the institution
• Identify favorable jurors: those with law enforcement connections (while still impartial), jurors who understand the difficulty of split-second decisions, those who value evidence over narratives, jurors who focus on individual facts rather than systemic arguments`
};

const CIVIL_RIGHTS_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Police Excessive Force',
    archetypes: `ADDITIONAL ARCHETYPES — POLICE EXCESSIVE FORCE
• The "I'd Be Scared Too" Juror — Over-identifies with the officer's fear and stress. Will excuse any level of force because "I don't know what I'd do in that situation."
• The Video Interpreter — Will watch body cam or bystander video and reach conclusions before hearing context. The video becomes the entire case.
• The De-Escalation Critic — Believes officers should always de-escalate and any use of force is excessive. Holds officers to an unrealistic standard.`,
    screeningPoints: `SCREENING — POLICE EXCESSIVE FORCE
• Personal experience with police use of force — as witness, victim, or family member
• Views on police reform, defunding/refunding police, body cameras
• Whether the juror has friends or family in law enforcement
• Media consumption about police shootings and use-of-force incidents
• Views on the objective reasonableness standard — whether it gives officers too much or too little discretion
• Whether the juror can evaluate force from the officer's perspective at the moment without hindsight bias`,
    inoculation: `INOCULATION — POLICE EXCESSIVE FORCE
• The standard is objective reasonableness — what a reasonable officer would do under the same circumstances, not what the juror would do
• Officers are trained in use-of-force continuum — the jury evaluates whether the officer followed training and protocol
• The Supreme Court recognizes that force situations are "tense, uncertain, and rapidly evolving" but that does not immunize all force
• Video evidence shows one perspective — it does not capture what the officer could see, hear, or perceive at that moment`
  },
  {
    name: 'Prisoner Rights',
    archetypes: `ADDITIONAL ARCHETYPES — PRISONER RIGHTS
• The "Prisoners Deserve What They Get" Juror — Believes incarcerated people have forfeited all rights. Cannot award damages for mistreatment of someone in prison.
• The System Critic — Believes the entire prison system is corrupt and will find liability regardless of the specific facts.
• The Crime Severity Weigher — Will evaluate the prisoner's civil rights claim through the lens of their underlying conviction. "What did they do to end up there?"`,
    screeningPoints: `SCREENING — PRISONER RIGHTS
• Views on prisoners' rights — do incarcerated people retain constitutional protections?
• Personal experience with incarceration (self or family members)
• Attitudes about prison conditions, solitary confinement, and correctional officer behavior
• Whether the juror will focus on the plaintiff's underlying criminal conviction rather than the civil rights violation
• Views on whether incarcerated people should have access to courts
• Employment in or connection to the corrections industry`,
    inoculation: `INOCULATION — PRISONER RIGHTS
• The Constitution protects all people, including those who are incarcerated — the Eighth Amendment prohibits cruel and unusual punishment
• The plaintiff's underlying criminal conviction is not relevant to whether their civil rights were violated in prison
• Correctional officers have a duty of care to incarcerated individuals — they are responsible for the safety and welfare of those in their custody
• Deliberate indifference to serious medical needs or safety risks violates the Constitution`
  }
];

// ─── MODULE 07: FAMILY LAW ─────────────────────────────────────────────────

const FAMILY_LAW_BASE: StrategyModule = {
  category: 'Family Law',
  archetypes: `DANGEROUS JUROR ARCHETYPES — FAMILY LAW

For the Petitioner/Plaintiff:
• The Traditional Values Absolutist — Holds rigid views about family structure, gender roles, and parenting. Cannot evaluate modern family arrangements (same-sex parents, non-traditional custody, stay-at-home fathers) without bias.
• The "Families Should Stay Together" Juror — Believes divorce is always harmful and that couples should work things out. Reluctant to support outcomes that finalize family dissolution.
• The Wealth Protector — Believes marital assets should stay with the earner. Hostile to equitable distribution, spousal support, or claims against inherited wealth.

For the Respondent/Defendant:
• The Scorned Spouse Identifier — Has been through a difficult divorce and identifies strongly with one party. Will project their own custody or financial battle onto the case.
• The Gender Bias Juror — Applies gender-based assumptions about parenting ability, financial contribution, or fault. "Mothers are always better parents" or "Fathers are always the breadwinners."
• The Punitive Divorce Juror — Wants to punish one party for perceived bad behavior in the marriage (infidelity, abandonment, substance abuse) through custody or financial penalties.`,

  biasPatterns: `BIAS PATTERNS — FAMILY LAW
• Gender-based custody presumptions — Belief that mothers are inherently better parents or that fathers are inherently less involved
• Fault-based thinking — Desire to punish one party for the end of the marriage through custody or financial outcomes
• Wealth-earner identification — Sympathy for the primary earner who "worked for" the assets
• Children-as-pawns perception — Belief that one party is using the children as leverage
• Religious or cultural values projection — Applying personal religious or cultural beliefs about marriage, divorce, and family to the case
• "Best interest" subjectivity — Substituting personal parenting philosophy for the legal standard`,

  questionSequencing: `QUESTION SEQUENCING — FAMILY LAW
1. Experience-based: Divorce experience (personal or family), custody disputes, blended families, single parenting
2. Attitude-based: Views on divorce, custody, spousal support, gender roles in parenting
3. Theme-specific: Experience with specific issues in the case (substance abuse, domestic violence, relocation, alienation)
4. Best interest: Understanding of the "best interest of the child" standard, willingness to apply legal factors rather than personal beliefs
5. Financial: Views on equitable distribution, spousal maintenance/alimony, child support calculation`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — FAMILY LAW
• Currently in a contested divorce or custody dispute
• Stated gender-based presumptions about parenting ("Mothers should always get custody")
• Stated inability to award spousal support or divide assets equitably
• Strong religious beliefs about divorce that prevent impartial application of the law
• Personal experience with a substantially similar family situation that prevents objectivity
• Close relationship with a party, attorney, or child welfare professional involved`,

  inoculation: `INOCULATION TOPICS — FAMILY LAW
• The legal standard is the best interest of the child — not the preferences of either parent
• Both parents have equal standing before the court regardless of gender
• Marital assets are jointly owned regardless of which party earned them — equitable distribution is the law
• A parent's behavior during the marriage may or may not be relevant to their parenting ability
• Spousal support is not a punishment or reward — it addresses economic imbalance created by the marriage
• Children benefit from meaningful relationships with both parents absent safety concerns`,

  plaintiffRules: `PETITIONER/PLAINTIFF SCREENING RULES — FAMILY LAW
• Screen for gender bias that favors the other parent based on stereotypical assumptions
• Screen for "families should stay together" attitudes that will resist necessary custody or financial determinations
• Screen for wealth protector mentality if seeking equitable distribution or support
• Screen for jurors in active divorce or custody disputes who cannot separate their case from this one
• Identify favorable jurors: those who prioritize children's welfare, jurors with co-parenting experience, those who understand economic imbalance in marriages`,

  defenseRules: `RESPONDENT/DEFENDANT SCREENING RULES — FAMILY LAW
• Screen for scorned spouse identifiers who will project their own divorce experience
• Screen for punitive divorce jurors who want to punish based on marital conduct rather than legal standards
• Screen for gender bias that favors the other party's gender in custody
• Screen for jurors who will judge the respondent's lifestyle, dating, or parenting choices post-separation
• Identify favorable jurors: those who understand shared parenting benefits, jurors who can apply the legal standard objectively, those with positive co-parenting experiences`
};

const FAMILY_LAW_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Custody',
    archetypes: `ADDITIONAL ARCHETYPES — CUSTODY
• The Helicopter Parent Projector — Imposes their own intensive parenting standards on the case. Judges any parenting that differs from their approach.
• The Alienation Alarmist — Believes parental alienation is rampant and will see it even when it doesn't exist. Conversely, may refuse to believe it exists at all.
• The Stability-Above-All Juror — Believes children should never be moved or have their routine disrupted. Will resist any custody change regardless of the circumstances.`,
    screeningPoints: `SCREENING — CUSTODY
• Personal custody dispute experience — current or past
• Views on shared custody vs. primary custody arrangements
• Attitudes about parental relocation and its impact on children
• Understanding of parental alienation — does the juror believe it exists? Can they identify it?
• Views on age-appropriate parenting styles and whether different approaches constitute bad parenting
• Experience with child welfare agencies, custody evaluators, or guardians ad litem
• Attitudes about non-traditional family structures (same-sex parents, grandparent custody, etc.)`,
    inoculation: `INOCULATION — CUSTODY
• The best interest of the child standard considers multiple factors — no single factor is determinative
• Children can thrive in many different custody arrangements — there is no one-size-fits-all answer
• A custody evaluator's recommendation is evidence but not binding on the fact-finder
• Parental alienation is a recognized pattern — one parent systematically undermining the child's relationship with the other`
  },
  {
    name: 'Termination of Parental Rights',
    archetypes: `ADDITIONAL ARCHETYPES — TERMINATION OF PARENTAL RIGHTS
• The "Give Them Another Chance" Juror — Believes every parent deserves unlimited chances to improve. Cannot terminate parental rights regardless of the evidence.
• The Quick Termination Advocate — Believes children should be removed from imperfect homes immediately. Low tolerance for parental struggles.
• The Foster Care Critic — Believes the foster care system is worse than any family situation. Reluctant to terminate because the alternative is foster care.`,
    screeningPoints: `SCREENING — TERMINATION OF PARENTAL RIGHTS
• Personal experience with child protective services — as a parent, foster parent, social worker, or family member
• Views on when the state should intervene in family decisions
• Attitudes about substance abuse, mental health, and parenting fitness
• Understanding of the permanency timeline — how long should a parent have to demonstrate improvement?
• Views on the foster care system and adoption
• Whether the juror can apply the clear and convincing evidence standard
• Emotional capacity to hear testimony about child neglect or abuse`,
    inoculation: `INOCULATION — TERMINATION OF PARENTAL RIGHTS
• Termination of parental rights is the most severe action the family court can take — it permanently severs the legal parent-child relationship
• The standard of proof is clear and convincing evidence — higher than preponderance but lower than beyond a reasonable doubt
• The focus is on the child's safety and welfare — not punishment of the parent
• The parent has been offered reunification services — the question is whether they have made sufficient progress`
  }
];

// ─── MODULE 08: PROBATE / ESTATE ────────────────────────────────────────────

const PROBATE_ESTATE_BASE: StrategyModule = {
  category: 'Probate / Estate',
  archetypes: `DANGEROUS JUROR ARCHETYPES — PROBATE / ESTATE

For the Will Proponent (Party Supporting the Will):
• The Family Entitlement Juror — Believes family members are automatically entitled to inherit regardless of what the will says. "You can't just cut your children out."
• The Undue Influence Presumptionist — Believes any family member who is close to an elderly person is automatically exerting undue influence. "They were just waiting for the money."
• The Elder Vulnerability Absolutist — Believes all elderly people are vulnerable and easily manipulated. Cannot accept that an elderly testator made a knowing, voluntary decision.

For the Will Contestant (Party Challenging the Will):
• The "A Will Is a Will" Formalist — Believes a signed will is sacrosanct and should never be challenged. "The deceased's wishes should be respected, period."
• The Anti-Family Drama Juror — Disgusted by family members fighting over money. Will reject the challenge regardless of its merit because they find the dispute distasteful.
• The Lawyer Trust Juror — Believes that if an attorney supervised the will signing, it must be valid. Defers to professional involvement without examining the circumstances.`,

  biasPatterns: `BIAS PATTERNS — PROBATE / ESTATE
• Family entitlement expectation — Belief that certain family members (children, spouses) should always inherit regardless of the testator's wishes
• Wealth and worthiness judgment — Evaluating whether heirs or beneficiaries "deserve" the inheritance based on their character or relationship
• Elder stereotyping — Assuming cognitive decline or vulnerability based on age alone
• Formalism bias — Over-valuing the formal execution of the will (notarized, attorney-supervised) without examining the underlying intent
• Greed projection — Assuming that any party contesting a will is motivated purely by greed
• Caregiver suspicion — Automatically suspecting the motives of family members who provided care in the decedent's final years`,

  questionSequencing: `QUESTION SEQUENCING — PROBATE / ESTATE
1. Experience-based: Personal experience with wills, estates, inheritance disputes, caring for elderly relatives
2. Attitude-based: Views on inheritance rights, family obligations, testamentary freedom
3. Theme-specific: Experience with elderly family members, cognitive decline, family conflicts about money
4. Legal concepts: Understanding of testamentary capacity, undue influence, fiduciary duty
5. Emotional tolerance: Ability to hear testimony about family dysfunction, end-of-life decisions, and contested inheritances without emotional bias`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — PROBATE / ESTATE
• Currently involved in an inheritance dispute or estate administration
• Stated belief that wills should never be challenged or that family members always deserve to inherit
• Close relationship with estate planning attorneys, fiduciaries, or financial advisors involved in the case
• Personal experience with a substantially similar estate dispute that prevents impartiality
• Stated inability to evaluate cognitive capacity objectively
• Financial interest in the outcome (e.g., beneficiary of a trust administered by one of the parties)`,

  inoculation: `INOCULATION TOPICS — PROBATE / ESTATE
• Testamentary freedom means a person can leave their assets to anyone they choose — they are not required to leave anything to family members
• Testamentary capacity is a legal standard — the testator must understand the nature and extent of their property, their relationship to potential heirs, and the effect of the will
• Undue influence requires more than close relationship or persuasion — it requires overcoming the testator's free will
• A will supervised by an attorney carries weight but is not immune from challenge if the circumstances suggest problems
• Contesting a will is a legal right — it does not automatically mean the contestant is greedy or disrespectful`,

  plaintiffRules: `WILL PROPONENT SCREENING RULES — PROBATE / ESTATE
• Screen for family entitlement jurors who believe children or spouses always deserve to inherit
• Screen for elder vulnerability absolutists who cannot believe an elderly testator acted freely
• Screen for undue influence presumptionists who will suspect any close family relationship
• Screen for jurors currently in inheritance disputes who cannot separate their experience
• Identify favorable jurors: those who value individual autonomy and testamentary freedom, jurors with estate planning experience, those who understand that family dynamics are complex`,

  defenseRules: `WILL CONTESTANT SCREENING RULES — PROBATE / ESTATE
• Screen for will formalists who believe signed documents are sacrosanct
• Screen for anti-family-drama jurors who will dismiss the challenge out of distaste
• Screen for attorney trust jurors who defer to professional involvement without scrutiny
• Screen for jurors who view any will contest as motivated by greed
• Identify favorable jurors: those who have witnessed elder exploitation, jurors who understand cognitive decline, those who value fairness over formalism, jurors who have cared for aging family members`
};

// ─── MODULE 09: INSURANCE ───────────────────────────────────────────────────

const INSURANCE_BASE: StrategyModule = {
  category: 'Insurance',
  archetypes: `DANGEROUS JUROR ARCHETYPES — INSURANCE

For the Policyholder/Claimant:
• The Premium Payer Juror — Fixated on the impact of claims on premiums. "If we award big claims, everyone's premiums go up." Aligns with the insurer's economic argument.
• The Contract Literalist — Reads the policy language narrowly and finds any ambiguity cuts against coverage. "The policy says what it says."
• The Insurance Industry Insider — Works for or has worked for an insurance company. Understands and sympathizes with the business model. May have adjustment bias.
• The Personal Responsibility Absolutist — Believes the insured should have read the policy more carefully or taken different precautions. Blames the policyholder.

For the Insurance Company:
• The Insurance Hater — Has had a claim denied and carries resentment. Believes all insurers are dishonest and act in bad faith. Will punish the insurer regardless of the specific facts.
• The David vs. Goliath Juror — Sees any individual vs. insurance company case as an unfair fight. Will side with the policyholder on principle.
• The Punitive Damages Enthusiast — Wants to make an example of the insurance company. Focused on punitive damages from the outset.
• The "I Pay Premiums, I Deserve Coverage" Juror — Believes any claim should be paid because the policyholder paid premiums. Cannot evaluate policy language objectively.`,

  biasPatterns: `BIAS PATTERNS — INSURANCE
• Premium impact bias — Concern that verdicts against insurers will raise premiums for everyone
• Insurance industry distrust — Belief that insurers routinely deny valid claims for profit
• Contract of adhesion sympathy — Awareness that the insured did not negotiate the policy terms cuts both ways
• Claim frequency bias — Belief that frequent claimants are fraudulent or that one denied claim means the insurer is bad
• Adjuster cynicism — Belief that insurance adjusters are trained to deny claims rather than evaluate them fairly
• "Read the fine print" blame — Faulting the policyholder for not understanding complex policy language`,

  questionSequencing: `QUESTION SEQUENCING — INSURANCE
1. Experience-based: Insurance claims experience (property, auto, health, disability), claim denials, disputes with insurers
2. Attitude-based: Views on the insurance industry, whether insurers treat policyholders fairly, premium concerns
3. Theme-specific: Experience with the specific type of insurance at issue, understanding of how policies work
4. Contract interpretation: Comfort reading and interpreting contract language, understanding of ambiguity rules
5. Damages: Views on punitive damages against insurers, understanding of bad faith remedies, consequential damages`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — INSURANCE
• Employment by or close relationship with the insurer or its parent company
• Pending insurance dispute or claim denial that creates identification bias
• Stated belief that insurance companies always act in bad faith or always act properly
• Financial interest in the insurance industry (stocks, pension tied to insurer performance)
• Prior experience as a claims adjuster, underwriter, or insurance defense attorney
• Stated inability to award punitive damages against an insurance company or stated intent to always award them`,

  inoculation: `INOCULATION TOPICS — INSURANCE
• Insurance policies are contracts — both parties have obligations. The insurer's obligation to pay valid claims is the core of the bargain.
• Policy language is drafted by the insurer — ambiguities are construed against the drafter
• Bad faith is not just a denied claim — it requires unreasonable conduct by the insurer, such as ignoring evidence, failing to investigate, or prioritizing profit over the policyholder's interests
• The policyholder pays premiums in exchange for the promise of coverage — the insurer must honor that promise in good faith
• An insurer can legitimately deny a claim if the policy does not cover the loss — the question is whether the denial was reasonable`,

  plaintiffRules: `POLICYHOLDER/CLAIMANT SCREENING RULES — INSURANCE
• Screen for premium impact bias — jurors focused on how verdicts affect insurance rates
• Screen for insurance industry insiders or family members who work in insurance
• Screen for contract literalists who will interpret policy language narrowly against coverage
• Screen for personal responsibility absolutists who blame the policyholder for not reading the policy
• Identify favorable jurors: those who have had claims unfairly denied, jurors who value consumer protection, those who understand that insurance policies are one-sided contracts of adhesion`,

  defenseRules: `INSURANCE COMPANY SCREENING RULES — INSURANCE
• Screen for insurance haters who have unresolved claim denial resentment
• Screen for David vs. Goliath jurors who will side with the individual on principle
• Screen for punitive damages enthusiasts who want to make an example of the insurer
• Screen for jurors who believe all premium payments entitle coverage regardless of policy terms
• Identify favorable jurors: business-minded jurors who understand contractual obligations, those with insurance industry knowledge, jurors who read contracts carefully and value clarity, those who can distinguish between a denied claim and bad faith`
};

const INSURANCE_OVERLAYS: SubSpecOverlay[] = [
  {
    name: 'Bad Faith',
    archetypes: `ADDITIONAL ARCHETYPES — BAD FAITH INSURANCE
• The "Insurers Are Evil" Absolutist — Believes every claim denial is bad faith. Cannot evaluate the reasonableness of the insurer's position.
• The Business Decision Defender — Sympathizes with the insurer's cost-containment strategies. Sees claims management as legitimate business practice even when it crosses the line.
• The Delay Apologist — Believes insurance claims naturally take a long time. Does not recognize unreasonable delay as a form of bad faith.`,
    screeningPoints: `SCREENING — BAD FAITH
• Personal experience with claim denials or delays — especially if protracted or painful
• Understanding of the difference between a legitimate coverage dispute and bad faith conduct
• Views on whether insurance companies should be punished for the way they handle claims
• Attitudes about punitive damages — are they appropriate when a company deliberately mistreats a customer?
• Whether the juror can evaluate internal insurance company documents objectively
• Experience with insurance claim processes — as claimant, adjuster, or broker`,
    inoculation: `INOCULATION — BAD FAITH
• Bad faith is not just a wrong decision — it is an unreasonable process. The insurer must conduct a reasonable investigation before denying a claim.
• Internal insurance company documents (claims notes, manuals, emails) reveal what the company knew and when
• An insurer that ignores its own expert's findings or fails to investigate evidence of coverage may be acting in bad faith
• Punitive damages in bad faith cases serve to deter insurers from systematically mistreating policyholders`
  },
  {
    name: 'Coverage Disputes/UM-UIM',
    archetypes: `ADDITIONAL ARCHETYPES — COVERAGE DISPUTES / UM-UIM
• The "You Chose Your Coverage" Juror — Believes the policyholder selected their coverage level and must live with it. Unsympathetic to arguments about inadequate coverage.
• The Stacking Skeptic — Views coverage stacking as a windfall for the policyholder. Reluctant to allow multiple policies to apply.
• The At-Fault Driver Focuser — In UM/UIM cases, focuses on the at-fault driver's irresponsibility rather than the insurer's coverage obligation.`,
    screeningPoints: `SCREENING — COVERAGE DISPUTES / UM-UIM
• Understanding of uninsured/underinsured motorist coverage and its purpose
• Views on whether insurance companies should pay when someone else caused the accident
• Attitudes about coverage stacking and anti-stacking provisions
• Personal experience with UM/UIM claims
• Understanding of the difference between liability coverage and first-party coverage
• Whether the juror has declined optional coverages and how they feel about that decision`,
    inoculation: `INOCULATION — COVERAGE DISPUTES / UM-UIM
• UM/UIM coverage exists specifically so that policyholders are protected when the at-fault driver has no or insufficient insurance
• The policyholder pays a separate premium for UM/UIM coverage — it is not free or bonus coverage
• Coverage stacking is a legal question — the court will instruct on whether it applies
• The insurer's duty to pay is triggered by the at-fault driver's lack of coverage, not by any fault of the policyholder`
  }
];

// ─── MODULE 10: GENERAL / FALLBACK ──────────────────────────────────────────

const GENERAL_FALLBACK_BASE: StrategyModule = {
  category: 'General / Fallback',
  archetypes: `DANGEROUS JUROR ARCHETYPES — GENERAL

For the Plaintiff/Prosecution:
• The Anti-Litigation Juror — Believes there are too many lawsuits and the courts are clogged. Will hold the bringing party to a higher standard out of principle.
• The Skeptic — Distrusts all parties and lawyers. Defaults to disbelief and sets an unreasonably high bar for any claim.
• The Status Quo Defender — Believes the current situation is acceptable and resists change, intervention, or remedy.

For the Defense:
• The Sympathy Voter — Makes decisions based on which party evokes more sympathy rather than the evidence and law.
• The Underdog Champion — Always sides with the perceived smaller or weaker party regardless of the merits.
• The Punisher — Wants to use the verdict to punish perceived wrongdoing rather than apply the legal standard objectively.`,

  biasPatterns: `BIAS PATTERNS — GENERAL
• Confirmation bias — Latching onto early impressions and filtering all subsequent evidence through that lens
• Anchoring — Over-relying on the first number, fact, or impression presented
• Authority deference — Automatically crediting testimony from professionals, experts, or officials
• Narrative bias — Preferring the more compelling story regardless of which party bears the burden of proof
• Recency bias — Over-weighting the last testimony heard in deliberations
• In-group/out-group dynamics — Identifying with parties who share their background and discounting those who differ`,

  questionSequencing: `QUESTION SEQUENCING — GENERAL
1. Experience-based: Prior jury service, involvement in lawsuits, relevant life experiences
2. Attitude-based: Views on the legal system, lawsuits, lawyers, and the fairness of trials
3. Theme-specific: Experience with the subject matter of the case, relevant attitudes and beliefs
4. Burden and proof: Understanding of the applicable burden of proof, willingness to follow the law as instructed
5. Damages/remedy: Comfort with the available remedies, willingness to apply them if the evidence supports them
6. Fairness commitment: Ability to be fair to both sides, follow instructions, and deliberate with an open mind`,

  causeChallengeGrounds: `CAUSE CHALLENGE GROUNDS — GENERAL
• Relationship with a party, attorney, or witness
• Fixed opinion about the outcome before hearing evidence
• Inability or unwillingness to follow the law as instructed
• Bias based on the type of case, the parties, or the subject matter
• Hardship that would prevent full attention and fair deliberation
• Financial or personal interest in the outcome`,

  inoculation: `INOCULATION TOPICS — GENERAL
• The burden of proof applies to specific parties — the jury must follow the court's instructions on who bears that burden
• Witness credibility is for the jury to evaluate — no witness is automatically more credible than another
• The jury must decide the case based on the evidence presented in the courtroom, not outside information or personal beliefs
• Both parties have the right to present their case and have it fairly evaluated
• The jury instructions are the law the jury must follow — personal disagreement with the law is not a basis for a different result`,

  plaintiffRules: `PLAINTIFF/PROSECUTION SCREENING RULES — GENERAL
• Screen for anti-litigation bias and lawsuit skepticism
• Screen for extreme skepticism that sets an impossibly high bar for the bringing party
• Screen for jurors with close ties to the opposing party or its industry
• Screen for jurors who cannot follow the applicable burden of proof
• Identify favorable jurors: those who value accountability, fairness, and the role of the court system`,

  defenseRules: `DEFENSE SCREENING RULES — GENERAL
• Screen for sympathy voters who will decide based on emotion rather than evidence
• Screen for underdog champions who will side with the perceived weaker party
• Screen for punishers who want to use the verdict to "send a message"
• Screen for jurors with personal experiences that create strong identification with the opposing party
• Identify favorable jurors: analytical thinkers, jurors who focus on evidence and instructions, those who value precision and fairness`
};

// ─── ROUTING TABLE ──────────────────────────────────────────────────────────

interface RoutingEntry {
  categoryModule: StrategyModule;
  subSpecOverlay: SubSpecOverlay | null;
}

const ROUTING_TABLE: Record<string, RoutingEntry> = {
  // Criminal Law
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

  // Personal Injury / Tort
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

  // Employment Law
  'employment law': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: null },
  'employment discrimination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'wrongful termination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'workplace discrimination': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[0] },
  'sexual harassment': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[1] },
  'hostile work environment': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[1] },
  'whistleblower': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[2] },
  'retaliation': { categoryModule: EMPLOYMENT_BASE, subSpecOverlay: EMPLOYMENT_OVERLAYS[2] },

  // Business / Commercial
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

  // Intellectual Property
  'intellectual property': { categoryModule: IP_BASE, subSpecOverlay: null },
  'patent infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[0] },
  'patent': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[0] },
  'trademark': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'copyright': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'trademark infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },
  'copyright infringement': { categoryModule: IP_BASE, subSpecOverlay: IP_OVERLAYS[1] },

  // Civil Rights
  'civil rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: null },
  'section 1983': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: null },
  'police excessive force': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'police brutality': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'excessive force': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'police shooting': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[0] },
  'prisoner rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },
  'inmate rights': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },
  'prison conditions': { categoryModule: CIVIL_RIGHTS_BASE, subSpecOverlay: CIVIL_RIGHTS_OVERLAYS[1] },

  // Family Law
  'family law': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: null },
  'divorce': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: null },
  'custody': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'child custody': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'custody modification': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[0] },
  'termination of parental rights': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[1] },
  'tpr': { categoryModule: FAMILY_LAW_BASE, subSpecOverlay: FAMILY_LAW_OVERLAYS[1] },

  // Probate / Estate
  'probate': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'estate dispute': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'will contest': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'trust dispute': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'undue influence': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },
  'estate litigation': { categoryModule: PROBATE_ESTATE_BASE, subSpecOverlay: null },

  // Insurance
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

export function getArchetypesAndBias(areaOfLaw: string, side: 'plaintiff' | 'defense'): string {
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
  sections.push('', assembleSideRules(categoryModule, side));

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
