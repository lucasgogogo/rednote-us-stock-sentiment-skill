export function validateConfig(cfg){
 if(!Number.isInteger(cfg.max_posts)||cfg.max_posts<1||cfg.max_posts>100||!Number.isInteger(cfg.max_comments)||cfg.max_comments<1||cfg.max_comments>50||!Number.isFinite(cfg.minimum_gap_ms)||cfg.minimum_gap_ms<3500)throw new Error('Invalid collection caps or pacing');
 if(!['rednote.com','www.rednote.com'].includes(cfg.host)||typeof cfg.keyword!=='string'||!cfg.keyword.trim()||typeof cfg.session!=='string'||!cfg.session.trim())throw new Error('Invalid target configuration');
 return cfg;
}
